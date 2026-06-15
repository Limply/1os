import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview(request):
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
