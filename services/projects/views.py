from rest_framework import viewsets, permissions
from .models import Project, TaskList, Task
from .serializers import ProjectSerializer, ProjectListSerializer, TaskListSerializer, TaskSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(tenant=self.request.tenant).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class TaskListViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaskListSerializer

    def get_queryset(self):
        qs = TaskList.objects.filter(tenant=self.request.tenant)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.filter(tenant=self.request.tenant)
        task_list_id = self.request.query_params.get('task_list')
        project_id = self.request.query_params.get('project')
        assigned_to = self.request.query_params.get('assigned_to')
        status = self.request.query_params.get('status')
        if task_list_id:
            qs = qs.filter(task_list_id=task_list_id)
        if project_id:
            qs = qs.filter(task_list__project_id=project_id)
        if assigned_to:
            qs = qs.filter(assigned_to_id=assigned_to)
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)
