import datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from shared.permissions import user_can, P


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview(request):
    if not user_can(request.user, P.DASHBOARD_VIEW):
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    today = timezone.now().date()
    month_start = today.replace(day=1)
    month_end = (month_start.replace(month=month_start.month % 12 + 1, day=1)
                 if month_start.month < 12
                 else month_start.replace(year=month_start.year + 1, month=1, day=1))

    from services.projects.models import Project, Task
    from services.hr.models import Employee, LeaveApplication
    try:
        from services.crm.models import Lead
        crm_available = True
    except Exception:
        crm_available = False

    projects = Project.objects.all()
    tasks    = Task.objects.all()
    employees = Employee.objects.filter(is_active=True)

    active_projects   = projects.filter(status='active').count()
    planning_projects = projects.filter(status='planning').count()
    on_hold_projects  = projects.filter(status='on_hold').count()

    overdue_tasks = tasks.filter(
        due_date__lt=today, status__in=['todo', 'in_progress', 'review']
    ).count()

    tasks_due_this_week = tasks.filter(
        due_date__gte=today,
        due_date__lte=today + datetime.timedelta(days=7),
        status__in=['todo', 'in_progress', 'review'],
    ).count()

    projects_ending_this_month = projects.filter(
        end_date__gte=today, end_date__lt=month_end, status='active'
    ).count()

    staff_on_leave = LeaveApplication.objects.filter(
        status='approved',
        start_date__lte=today,
        end_date__gte=today,
    ).values('employee').distinct().count()

    won_leads_this_month = 0
    open_leads = 0
    if crm_available:
        won_leads_this_month = Lead.objects.filter(
            status='won',
            updated_at__date__gte=month_start,
        ).count()
        open_leads = Lead.objects.filter(
            status__in=['new', 'contacted', 'quoted']
        ).count()

    # Mini-lists
    ending_soon = list(
        projects.filter(status='active', end_date__gte=today)
        .order_by('end_date')
        .values('id', 'project_no', 'name', 'end_date', 'progress')[:5]
    )
    for p in ending_soon:
        delta = (p['end_date'] - today).days
        p['days_left'] = delta
        p['end_date'] = str(p['end_date'])
        p['id'] = str(p['id'])

    recent_overdue = list(
        tasks.filter(due_date__lt=today, status__in=['todo', 'in_progress', 'review'])
        .order_by('due_date')
        .values('id', 'title', 'due_date', 'priority', 'project__project_no', 'project__name')[:5]
    )
    for t in recent_overdue:
        t['id'] = str(t['id'])
        t['due_date'] = str(t['due_date'])
        t['days_overdue'] = (today - datetime.date.fromisoformat(t['due_date'])).days

    return Response({
        'kpis': {
            'active_projects':           active_projects,
            'planning_projects':         planning_projects,
            'on_hold_projects':          on_hold_projects,
            'overdue_tasks':             overdue_tasks,
            'tasks_due_this_week':       tasks_due_this_week,
            'projects_ending_this_month': projects_ending_this_month,
            'staff_on_leave_today':      staff_on_leave,
            'total_employees':           employees.count(),
            'won_leads_this_month':      won_leads_this_month,
            'open_leads':                open_leads,
        },
        'ending_soon':    ending_soon,
        'overdue_tasks_list': recent_overdue,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisor_home(request):
    if not user_can(request.user, P.SUPERVISOR_APP):
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    from services.projects.models import Project, Task
    from services.hr.models import Attendance

    today = timezone.now().date()
    user = request.user

    # Active project for this supervisor
    active_project = (
        Project.objects
        .filter(supervisor=user, status='active')
        .first()
    )

    site = None
    project_info = None
    if active_project:
        site = {
            'name': active_project.name,
            'project_no': active_project.project_no,
            'status': active_project.status,
            'site_address': active_project.site_address,
            'site_lat': str(active_project.site_lat) if active_project.site_lat else None,
            'site_lng': str(active_project.site_lng) if active_project.site_lng else None,
        }
        project_info = {
            'id': str(active_project.id),
            'name': active_project.name,
            'project_no': active_project.project_no,
        }

    # Task counts across all active supervised projects
    supervised_tasks = Task.objects.filter(
        project__supervisor=user,
        project__status='active',
    )
    tasks_done    = supervised_tasks.filter(status='done').count()
    tasks_pending = supervised_tasks.filter(status__in=['todo', 'in_progress', 'review']).count()
    tasks_urgent  = supervised_tasks.filter(priority='urgent').exclude(status='done').count()

    # Workers on site today (clocked in on any supervised project)
    workers_on_site = Attendance.objects.filter(
        date=today,
        clock_in__isnull=False,
        project__supervisor=user,
    ).count()

    # Today's task list (non-done, assigned to logged-in user or on supervised projects)
    task_qs = (
        supervised_tasks
        .exclude(status='done')
        .filter(Q(assigned_to=user) | Q(assigned_to__isnull=False))
        .select_related('project')
        .order_by('priority', 'due_date')[:10]
    )
    tasks_list = [
        {
            'id':         str(t.id),
            'title':      t.title,
            'group':      t.group,
            'status':     t.status,
            'priority':   t.priority,
            'project':    t.project.name,
            'project_no': t.project.project_no,
        }
        for t in task_qs
    ]

    # Team today — employees clocked in on supervised projects
    team_qs = (
        Attendance.objects
        .filter(date=today, clock_in__isnull=False, project__supervisor=user)
        .select_related('employee', 'employee__position')
        .order_by('clock_in')
    )
    team_list = [
        {
            'name':       a.employee.full_name,
            'position':   a.employee.position.title if a.employee.position else '',
            'clock_in':   timezone.localtime(a.clock_in).strftime('%H:%M') if a.clock_in else None,
            'clock_out':  timezone.localtime(a.clock_out).strftime('%H:%M') if a.clock_out else None,
            'status':     'out' if a.clock_out else 'in',
        }
        for a in team_qs
    ]

    return Response({
        'project': project_info,
        'site': site,
        'summary': {
            'workers_on_site': workers_on_site,
            'tasks_done':      tasks_done,
            'tasks_pending':   tasks_pending,
            'tasks_urgent':    tasks_urgent,
        },
        'tasks': tasks_list,
        'team':  team_list,
    })

PROBLEM_REPORT_RECIPIENTS = [
    'alain@astronic.com.sg',
    'steve.wong@astronic.com.sg',
    'lucus@astronic.com.sg',
    'lixin@astronic.com.sg',       # Benjamin Tan
    'admin@astronic.com.sg',       # HR Admin (Yan Ting)
]

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def problem_report(request):
    user     = request.user
    subject  = request.data.get('subject', '').strip() or 'Site Problem Report'
    body     = request.data.get('body', '').strip()
    severity = request.data.get('severity', 'medium')
    project  = request.data.get('project', '')

    if not body:
        return Response({'detail': 'Body is required.'}, status=status.HTTP_400_BAD_REQUEST)

    full_subject = f"[{severity.upper()}] {subject}"
    full_body    = (
        f"Problem Report from {user.full_name} ({user.email})\n"
        f"Project : {project}\n"
        f"Severity: {severity}\n\n"
        f"{body}\n\n"
        f"-- Submitted via 1OS Supervisor App"
    )

    # Use frontend-selected recipients, filtered to known valid addresses
    requested   = request.data.get('recipients', [])
    valid_set   = set(PROBLEM_REPORT_RECIPIENTS)
    recipient_list = [e for e in requested if e in valid_set] or PROBLEM_REPORT_RECIPIENTS

    email_sent = False
    email_error = ''
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        if getattr(settings, 'EMAIL_HOST', ''):
            send_mail(
                subject=full_subject,
                message=full_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipient_list,
                fail_silently=False,
            )
            email_sent = True
    except Exception as e:
        email_error = str(e)

    return Response({
        'ok': True,
        'email_sent': email_sent,
        'email_error': email_error,
        'recipients': recipient_list,
    })
