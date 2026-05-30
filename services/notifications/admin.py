from django.contrib import admin
from shared.admin import TenantModelAdmin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(TenantModelAdmin):
    list_display = ['recipient', 'channel', 'trigger', 'status', 'is_read', 'sent_at', 'created_at']
    search_fields = ['recipient__email', 'subject', 'trigger']
    list_filter = ['channel', 'status', 'is_read']
    ordering = ['-created_at']
