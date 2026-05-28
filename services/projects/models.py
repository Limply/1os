from django.db import models
from django.utils import timezone
from shared.models import BaseModel


class Project(BaseModel):
    """A client or internal project managed within the tenant."""
    TYPE_CHOICES = [
        ('client', 'Client Project'),
        ('internal', 'Internal Project'),
    ]
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='client')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    description = models.TextField(blank=True, null=True)
    client_name = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    manager = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='managed_projects'
    )
    members = models.JSONField(default=list, blank=True, help_text='List of User UUIDs')
    progress = models.IntegerField(default=0, help_text='Auto-calculated from task completion')

    ref_type = models.CharField(max_length=50, blank=True, null=True)
    ref_id = models.UUIDField(null=True, blank=True)

    def __str__(self):
        return self.name

    def recalculate_progress(self):
        total = Task.objects.filter(task_list__project=self).count()
        if total == 0:
            self.progress = 0
        else:
            done = Task.objects.filter(task_list__project=self, status='done').count()
            self.progress = round((done / total) * 100)
        self.save(update_fields=['progress'])


class TaskList(BaseModel):
    """A named group of tasks within a project (e.g. Phase 1, Installation)."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='task_lists')
    name = models.CharField(max_length=255)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.project.name} — {self.name}"

    @property
    def completion(self):
        total = self.tasks.count()
        if total == 0:
            return 0
        return round((self.tasks.filter(status='done').count() / total) * 100)


class Task(BaseModel):
    """An individual work item assigned to a worker within a task list."""
    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('review', 'In Review'),
        ('done', 'Done'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    task_list = models.ForeignKey(TaskList, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    assigned_to = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_tasks'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['priority', 'due_date']

    def __str__(self):
        return f"{self.task_list.name} — {self.title}"

    def save(self, *args, **kwargs):
        if self.status == 'done' and not self.completed_at:
            self.completed_at = timezone.now()
        elif self.status != 'done':
            self.completed_at = None
        super().save(*args, **kwargs)
        self.task_list.project.recalculate_progress()
