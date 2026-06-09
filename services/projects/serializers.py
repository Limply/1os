from rest_framework import serializers
from collections import defaultdict
from .models import Project, Task, TaskPhoto, TaskDocument


class TaskPhotoSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskPhoto
        fields = ['id', 'task', 'photo', 'comment', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.full_name if obj.uploaded_by else None


class TaskDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskDocument
        fields = ['id', 'task', 'file', 'filename', 'comment', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'filename', 'uploaded_by', 'created_at']

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.full_name if obj.uploaded_by else None


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    photo_count = serializers.SerializerMethodField()
    doc_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'group', 'title', 'description',
            'assigned_to', 'assigned_to_name',
            'status', 'priority', 'weightage', 'start_date', 'end_date', 'due_date', 'completed_at',
            'photo', 'photo_count', 'doc_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'completed_at', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.full_name if obj.assigned_to else None

    def get_photo_count(self, obj):
        return obj.photos.count()

    def get_doc_count(self, obj):
        return obj.documents.count()


class ProjectListSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'project_no', 'name', 'type', 'status', 'priority',
            'client_name', 'client_contact', 'client_email', 'client_phone',
            'start_date', 'end_date', 'manager', 'manager_name', 'progress', 'task_count',
        ]

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None


class ProjectSerializer(serializers.ModelSerializer):
    task_groups = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'tenant', 'project_no', 'name', 'type', 'status', 'priority',
            'description',
            'client_name', 'client_contact', 'client_email', 'client_phone', 'client_address',
            'start_date', 'end_date',
            'manager', 'manager_name', 'members', 'progress', 'ref_type', 'ref_id',
            'task_count', 'task_groups', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'tenant', 'project_no', 'progress', 'created_at', 'updated_at']

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None

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
