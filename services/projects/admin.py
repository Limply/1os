from django.contrib import admin
from .models import Project, Task


class TaskInline(admin.TabularInline):
    model = Task
    extra = 0
    fields = ['group', 'title', 'assigned_to', 'status', 'priority', 'due_date']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'status', 'priority', 'client_name', 'manager', 'progress', 'end_date']
    search_fields = ['name', 'client_name']
    list_filter = ['type', 'status', 'priority']
    ordering = ['-created_at']
    inlines = [TaskInline]


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'group', 'assigned_to', 'status', 'priority', 'due_date']
    search_fields = ['title', 'group', 'project__name']
    list_filter = ['status', 'priority', 'project']
    ordering = ['project', 'group', 'due_date']
