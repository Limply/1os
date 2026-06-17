import datetime
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


def _generate_for_user(user):
    today = timezone.now().date()
    created = 0

    # Tasks due today or in 2 days assigned to this user
    try:
        from services.projects.models import Task
        soon = today + datetime.timedelta(days=2)
        for task in Task.objects.filter(
            assigned_to=user,
            due_date__in=[today, soon],
            status__in=['todo', 'in_progress', 'review'],
        ):
            _, new = Notification.objects.get_or_create(
                recipient=user,
                trigger='task_due_soon',
                ref_type='Task',
                ref_id=task.id,
                is_read=False,
                defaults={
                    'channel': 'in_app',
                    'subject': f'Task due soon: {task.title}',
                    'message': f'"{task.title}" is due {task.due_date}.',
                    'status': 'sent',
                },
            )
            if new:
                created += 1
    except Exception:
        pass

    # Overdue CRM lead follow-ups assigned to this user
    try:
        from services.crm.models import Lead
        for lead in Lead.objects.filter(
            assigned_to=user,
            next_follow_up__lt=today,
            status__in=['new', 'contacted', 'quoted'],
        ):
            _, new = Notification.objects.get_or_create(
                recipient=user,
                trigger='lead_followup_overdue',
                ref_type='Lead',
                ref_id=lead.id,
                is_read=False,
                defaults={
                    'channel': 'in_app',
                    'subject': f'Follow-up overdue: {lead.title}',
                    'message': f'Lead "{lead.title}" follow-up was due {lead.next_follow_up}.',
                    'status': 'sent',
                },
            )
            if new:
                created += 1
    except Exception:
        pass

    # Leave applications pending approval — managers only
    if user.role in ('admin', 'superadmin', 'manager'):
        try:
            from services.hr.models import LeaveApplication
            for leave in LeaveApplication.objects.filter(status='pending'):
                _, new = Notification.objects.get_or_create(
                    recipient=user,
                    trigger='leave_pending',
                    ref_type='Leave',
                    ref_id=leave.id,
                    is_read=False,
                    defaults={
                        'channel': 'in_app',
                        'subject': 'Leave pending approval',
                        'message': f'{leave.employee} applied for {leave.leave_type} ({leave.start_date} → {leave.end_date}).',
                        'status': 'sent',
                    },
                )
                if new:
                    created += 1
        except Exception:
            pass

    return created


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        qs = Notification.objects.filter(
            recipient=self.request.user,
            channel='in_app',
        )
        if self.request.query_params.get('unread') == '1':
            qs = qs.filter(is_read=False)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save(update_fields=['is_read', 'read_at'])
        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'], url_path='read-all')
    def mark_all_read(self, request):
        Notification.objects.filter(
            recipient=request.user, channel='in_app', is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        count = _generate_for_user(request.user)
        unread = Notification.objects.filter(
            recipient=request.user, channel='in_app', is_read=False
        ).count()
        return Response({'generated': count, 'unread': unread})
