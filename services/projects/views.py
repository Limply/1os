from rest_framework import viewsets, permissions
from .models import Project, Task
from .serializers import ProjectSerializer, ProjectListSerializer, TaskSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Project.objects.order_by('-created_at')
        project_no = self.request.query_params.get('project_no')
        if project_no:
            qs = qs.filter(project_no=project_no)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.all()
        project_id = self.request.query_params.get('project')
        group = self.request.query_params.get('group')
        assigned_to = self.request.query_params.get('assigned_to')
        status = self.request.query_params.get('status')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if group is not None:
            qs = qs.filter(group=group)
        if assigned_to:
            qs = qs.filter(assigned_to_id=assigned_to)
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)
