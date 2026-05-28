from rest_framework import serializers
from .models import Project, Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'id', 'project', 'title', 'description', 'assigned_to',
            'status', 'priority', 'due_date', 'completed_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'tenant', 'name', 'type', 'status', 'priority',
            'description', 'client_name', 'start_date', 'end_date',
            'manager', 'members', 'progress', 'ref_type', 'ref_id',
            'task_count', 'tasks', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at']

    def get_task_count(self, obj):
        return obj.tasks.count()


class ProjectListSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'type', 'status', 'priority',
            'client_name', 'start_date', 'end_date',
            'manager', 'progress', 'task_count',
        ]

    def get_task_count(self, obj):
        return obj.tasks.count()
