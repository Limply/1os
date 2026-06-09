from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from .models import Project, Task, TaskPhoto, TaskDocument
from .serializers import ProjectSerializer, ProjectListSerializer, TaskSerializer, TaskPhotoSerializer, TaskDocumentSerializer

MANAGER_ROLES = {'manager', 'admin', 'superadmin'}


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

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in MANAGER_ROLES:
            raise PermissionDenied('Only managers can delete tasks.')
        return super().destroy(request, *args, **kwargs)


class TaskPhotoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaskPhotoSerializer
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        qs = TaskPhoto.objects.select_related('uploaded_by')
        task_id = self.request.query_params.get('task')
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.user.tenant,
            uploaded_by=self.request.user,
        )


class TaskDocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaskDocumentSerializer
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        qs = TaskDocument.objects.select_related('uploaded_by')
        task_id = self.request.query_params.get('task')
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.user.tenant,
            uploaded_by=self.request.user,
        )
