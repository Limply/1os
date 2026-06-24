from django.contrib import admin
from shared.admin import TenantModelAdmin
from .models import Project, Task


class TaskInline(admin.TabularInline):
    model = Task
    extra = 0
    fields = ['group', 'title', 'assigned_to', 'status', 'priority', 'due_date']


@admin.register(Project)
class ProjectAdmin(TenantModelAdmin):
    list_display = ['project_no', 'name', 'status', 'priority', 'client_name', 'manager', 'progress', 'end_date']
    search_fields = ['project_no', 'name', 'client_name']
    list_filter = ['status', 'priority']
    ordering = ['-created_at']
    readonly_fields = ['project_no']
    fieldsets = [
        (None, {'fields': ['project_no', 'name', 'status', 'priority', 'description']}),
        ('Client', {'fields': ['client_name', 'client_contact', 'client_email', 'client_phone', 'client_address']}),
        ('Schedule', {'fields': ['start_date', 'end_date', 'manager', 'members']}),
    ]
    inlines = [TaskInline]


@admin.register(Task)
class TaskAdmin(TenantModelAdmin):
    list_display = ['title', 'project', 'group', 'assigned_to', 'status', 'priority', 'due_date']
    search_fields = ['title', 'group', 'project__name']
    list_filter = ['status', 'priority', 'project']
    ordering = ['project', 'group', 'due_date']
