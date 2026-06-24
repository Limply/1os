from rest_framework import serializers
from collections import defaultdict
from .models import Project, Task, TaskPhoto, TaskDocument, TaskComment, ProjectComment, DailyReport


class TaskPhotoSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = TaskPhoto
        fields = ['id', 'task', 'photo', 'photo_url', 'comment', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.full_name if obj.uploaded_by else None

    def get_photo_url(self, obj):
        return obj.photo.url if obj.photo else None


class TaskDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TaskDocument
        fields = ['id', 'task', 'file', 'file_url', 'filename', 'comment', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'filename', 'uploaded_by', 'created_at']

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.full_name if obj.uploaded_by else None

    def get_file_url(self, obj):
        return obj.file.url if obj.file else None


class TaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_initials = serializers.SerializerMethodField()

    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'author', 'author_name', 'author_initials', 'body', 'created_at']
        read_only_fields = ['id', 'author', 'author_name', 'author_initials', 'created_at']

    def get_author_name(self, obj):
        return obj.author.full_name if obj.author else 'Unknown'

    def get_author_initials(self, obj):
        if not obj.author:
            return '?'
        return (obj.author.first_name[:1] + obj.author.last_name[:1]).upper() or obj.author.email[:2].upper()


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    assigned_to_phone = serializers.SerializerMethodField()
    photo_count = serializers.SerializerMethodField()
    doc_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    project_no = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'project_name', 'project_no', 'group', 'title', 'description',
            'assigned_to', 'assigned_to_name', 'assigned_to_phone',
            'status', 'priority', 'weightage', 'start_date', 'end_date', 'due_date', 'completed_at',
            'photo', 'photo_count', 'doc_count', 'comment_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'completed_at', 'created_at', 'updated_at']

    def get_project_name(self, obj):
        return obj.project.name if obj.project else None

    def get_project_no(self, obj):
        return obj.project.project_no if obj.project else None

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.full_name if obj.assigned_to else None

    def get_assigned_to_phone(self, obj):
        if not obj.assigned_to:
            return None
        try:
            return obj.assigned_to.employee_profile.phone
        except Exception:
            return None

    def get_photo_count(self, obj):
        return obj.photos.count()

    def get_doc_count(self, obj):
        return obj.documents.count()

    def get_comment_count(self, obj):
        return obj.comments.count()


class ProjectListSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    supervisor_name = serializers.SerializerMethodField()
    quoted_amount = serializers.SerializerMethodField()
    payment_received = serializers.SerializerMethodField()
    expenses = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'project_no', 'name', 'status', 'priority',
            'client_name', 'client_contact', 'client_email', 'client_phone',
            'start_date', 'end_date', 'manager', 'manager_name',
            'supervisor', 'supervisor_name', 'progress', 'task_count',
            'quoted_amount', 'payment_received', 'expenses',
        ]

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None

    def get_supervisor_name(self, obj):
        return obj.supervisor.full_name if obj.supervisor else None

    def get_quoted_amount(self, obj):
        from django.db.models import Sum
        from services.finance.models import Quotation
        if not obj.project_no:
            return 0
        result = Quotation.objects.filter(
            project_no=obj.project_no
        ).exclude(status='rejected').aggregate(Sum('total'))['total__sum']
        return result or 0

    def get_payment_received(self, obj):
        from django.db.models import Sum
        from services.finance.models import Payment
        if not obj.project_no:
            return 0
        result = Payment.objects.filter(
            project_no=obj.project_no
        ).aggregate(Sum('amount'))['amount__sum']
        return result or 0

    def get_expenses(self, obj):
        from django.db.models import Sum
        from services.finance.models import Expense
        if not obj.project_no:
            return 0
        result = Expense.objects.filter(
            project_no=obj.project_no
        ).aggregate(Sum('amount'))['amount__sum']
        return result or 0


class ProjectSerializer(serializers.ModelSerializer):
    task_groups = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    supervisor_name = serializers.SerializerMethodField()
    quoted_amount = serializers.SerializerMethodField()
    payment_received = serializers.SerializerMethodField()
    expenses = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'project_no', 'name', 'status', 'priority',
            'description', 'remarks',
            'client_name', 'client_contact', 'client_email', 'client_phone', 'client_address',
            'site_address', 'site_lat', 'site_lng',
            'start_date', 'end_date',
            'manager', 'manager_name', 'supervisor', 'supervisor_name',
            'members', 'progress',
            'partner', 'quoted_amount', 'payment_received', 'expenses', 'payment_record', 'external_link',
            'ref_type', 'ref_id',
            'task_count', 'task_groups', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'project_no', 'progress', 'created_at', 'updated_at']

    def get_quoted_amount(self, obj):
        from django.db.models import Sum
        from services.finance.models import Quotation
        if not obj.project_no:
            return 0
        result = Quotation.objects.filter(
            project_no=obj.project_no
        ).exclude(status='rejected').aggregate(Sum('total'))['total__sum']
        return result or 0

    def get_payment_received(self, obj):
        from django.db.models import Sum
        from services.finance.models import Payment
        if not obj.project_no:
            return 0
        result = Payment.objects.filter(
            project_no=obj.project_no
        ).aggregate(Sum('amount'))['amount__sum']
        return result or 0

    def get_expenses(self, obj):
        from django.db.models import Sum
        from services.finance.models import Expense
        if not obj.project_no:
            return 0
        result = Expense.objects.filter(
            project_no=obj.project_no
        ).aggregate(Sum('amount'))['amount__sum']
        return result or 0

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None

    def get_supervisor_name(self, obj):
        return obj.supervisor.full_name if obj.supervisor else None

    def get_task_groups(self, obj):
        groups = defaultdict(list)
        for task in obj.tasks.all():
            groups[task.group].append(TaskSerializer(task).data)
        result = []
        for group_name, tasks in groups.items():
            done = sum(1 for t in tasks if t['status'] == 'done')
            total = len(tasks)
            result.append({
                'group': group_name,
                'task_count': total,
                'done_count': done,
                'completion': round((done / total) * 100) if total else 0,
                'tasks': tasks,
            })
        return result


class ProjectCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_initials = serializers.SerializerMethodField()

    class Meta:
        model = ProjectComment
        fields = ['id', 'project', 'author', 'author_name', 'author_initials', 'body', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']

    def get_author_name(self, obj):
        return obj.author.full_name if obj.author else 'Unknown'

    def get_author_initials(self, obj):
        if not obj.author:
            return '?'
        return (obj.author.first_name[:1] + obj.author.last_name[:1]).upper() or obj.author.email[:2].upper()


class DailyReportSerializer(serializers.ModelSerializer):
    total_manpower  = serializers.ReadOnlyField()
    photo_url       = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()
    project_name    = serializers.SerializerMethodField()
    project_no      = serializers.SerializerMethodField()

    class Meta:
        model  = DailyReport
        fields = [
            'id', 'project', 'project_name', 'project_no',
            'submitted_by', 'submitted_by_name',
            'date', 'company',
            'supervisor_count', 'g_workers_count', 'total_manpower',
            'activity_short', 'activity_items', 'personnel_names',
            'work_start', 'work_end',
            'photo', 'photo_url',
            'created_at',
        ]
        read_only_fields = ['id', 'submitted_by', 'created_at']

    def get_photo_url(self, obj):
        return obj.photo.url if obj.photo else None

    def get_submitted_by_name(self, obj):
        return obj.submitted_by.full_name if obj.submitted_by else None

    def get_project_name(self, obj):
        return obj.project.name if obj.project else None

    def get_project_no(self, obj):
        return obj.project.project_no if obj.project else None
