from rest_framework import viewsets, permissions
from .models import Project, Task
from .serializers import ProjectSerializer, ProjectListSerializer, TaskSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    """CRUD for projects scoped to the current tenant."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(tenant=self.request.tenant).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class TaskViewSet(viewsets.ModelViewSet):
    """CRUD for tasks scoped to the current tenant."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.filter(tenant=self.request.tenant)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.order_by('status', 'due_date')

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)
