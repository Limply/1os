import datetime
from django.db import models
from django.utils import timezone
from shared.models import BaseModel
from shared.storage import FileBrowserStorage  # used by HR attendance/employee photos


def _generate_project_no():
    year = str(datetime.date.today().year)[2:]
    prefix = f'AST-{year}-'
    last = Project.objects.filter(
        project_no__startswith=prefix
    ).order_by('-project_no').first()
    seq = int(last.project_no.split('-')[-1]) + 1 if last else 1
    return f'{prefix}{seq:03d}'


class Project(BaseModel):
    TYPE_CHOICES = [
        ('client', 'Client Project'),
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

    project_no    = models.CharField(max_length=30, unique=True, blank=True)
    name          = models.CharField(max_length=255)
    type          = models.CharField(max_length=20, choices=TYPE_CHOICES, default='client')
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    priority      = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    description   = models.TextField(blank=True, null=True)

    # Client info — referenced by quotations
    client_name    = models.CharField(max_length=255, blank=True, null=True)
    client_contact = models.CharField(max_length=255, blank=True, null=True, help_text='Contact person name')
    client_email   = models.EmailField(blank=True, null=True)
    client_phone   = models.CharField(max_length=20, blank=True, null=True)
    client_address = models.TextField(blank=True, null=True)

    start_date = models.DateField(null=True, blank=True)
    end_date   = models.DateField(null=True, blank=True)
    manager    = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='managed_projects'
    )
    supervisor = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='supervised_projects'
    )
    members  = models.JSONField(default=list, blank=True)
    progress = models.IntegerField(default=0)

    # Additional project tracking fields
    remarks          = models.TextField(blank=True, null=True)
    partner          = models.CharField(max_length=255, blank=True, null=True)
    payment_record = models.TextField(blank=True, null=True)
    external_link    = models.CharField(max_length=1000, blank=True, null=True)

    ref_type = models.CharField(max_length=50, blank=True, null=True)
    ref_id   = models.UUIDField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.project_no:
            self.project_no = _generate_project_no()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.project_no} — {self.name}'

    def recalculate_progress(self):
        from django.db.models import Sum
        total_weight = self.tasks.aggregate(t=Sum('weightage'))['t'] or 0
        if total_weight == 0:
            self.progress = 0
        else:
            done_weight = self.tasks.filter(status='done').aggregate(t=Sum('weightage'))['t'] or 0
            self.progress = round((done_weight / total_weight) * 100)
        self.save(update_fields=['progress'])


class Task(BaseModel):
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

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    group = models.CharField(max_length=255, blank=True, default='')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    assigned_to = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_tasks'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    weightage = models.PositiveSmallIntegerField(default=1)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    photo = models.ImageField(upload_to='tasks/', null=True, blank=True)

    class Meta:
        ordering = ['group', 'priority', 'due_date']

    def __str__(self):
        return f"{self.project.name} — {self.title}"

    def save(self, *args, **kwargs):
        if self.status == 'done' and not self.completed_at:
            self.completed_at = timezone.now()
        elif self.status != 'done':
            self.completed_at = None
        super().save(*args, **kwargs)
        self.project.recalculate_progress()


class TaskPhoto(BaseModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='photos')
    photo = models.ImageField(upload_to='tasks/photos/')
    comment = models.TextField(blank=True, default='')
    uploaded_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='task_photos'
    )

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.task.title} — photo {self.id}"


class TaskDocument(BaseModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to='tasks/documents/')
    filename = models.CharField(max_length=255, blank=True)
    comment = models.TextField(blank=True, default='')
    uploaded_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='task_documents'
    )

    class Meta:
        ordering = ['created_at']

    def save(self, *args, **kwargs):
        if not self.filename and self.file:
            self.filename = self.file.name.split('/')[-1]
        super().save(*args, **kwargs)


class TaskComment(BaseModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='task_comments'
    )
    body = models.TextField()

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.task.title} — comment by {self.author}"


class ProjectComment(BaseModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='project_comments'
    )
    body = models.TextField()

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.project.project_no} — comment by {self.author}"
