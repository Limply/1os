from rest_framework import serializers
from .models import Project, TaskList, Task


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'task_list', 'title', 'description', 'assigned_to', 'assigned_to_name',
            'status', 'priority', 'due_date', 'completed_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'completed_at', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.full_name
        return None


class TaskListSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)
    completion = serializers.IntegerField(read_only=True)
    task_count = serializers.SerializerMethodField()
    done_count = serializers.SerializerMethodField()

    class Meta:
        model = TaskList
        fields = [
            'id', 'project', 'name', 'order',
            'completion', 'task_count', 'done_count',
            'tasks', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_done_count(self, obj):
        return obj.tasks.filter(status='done').count()


class ProjectListSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'type', 'status', 'priority',
            'client_name', 'start_date', 'end_date',
            'manager', 'manager_name', 'progress', 'task_count',
        ]

    def get_task_count(self, obj):
        return Task.objects.filter(task_list__project=obj).count()

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None


class ProjectSerializer(serializers.ModelSerializer):
    task_lists = TaskListSerializer(many=True, read_only=True)
    task_count = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'tenant', 'name', 'type', 'status', 'priority',
            'description', 'client_name', 'start_date', 'end_date',
            'manager', 'manager_name', 'members', 'progress', 'ref_type', 'ref_id',
            'task_count', 'task_lists', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'tenant', 'progress', 'created_at', 'updated_at']

    def get_task_count(self, obj):
        return Task.objects.filter(task_list__project=obj).count()

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None
