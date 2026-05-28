from django.contrib import admin
from .models import Project, TaskList, Task


class TaskInline(admin.TabularInline):
    model = Task
    extra = 0
    fields = ['title', 'assigned_to', 'status', 'priority', 'due_date']


class TaskListInline(admin.TabularInline):
    model = TaskList
    extra = 0
    fields = ['name', 'order']
    show_change_link = True


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'status', 'priority', 'client_name', 'manager', 'progress', 'end_date']
    search_fields = ['name', 'client_name']
    list_filter = ['type', 'status', 'priority']
    ordering = ['-created_at']
    inlines = [TaskListInline]


@admin.register(TaskList)
class TaskListAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'order', 'tenant']
    search_fields = ['name', 'project__name']
    list_filter = ['project']
    ordering = ['project', 'order']
    inlines = [TaskInline]


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'task_list', 'assigned_to', 'status', 'priority', 'due_date']
    search_fields = ['title', 'task_list__name', 'task_list__project__name']
    list_filter = ['status', 'priority']
    ordering = ['due_date']
