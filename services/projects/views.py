import os
import re
from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from .models import Project, Task, TaskPhoto, TaskDocument
from .serializers import ProjectSerializer, ProjectListSerializer, TaskSerializer, TaskPhotoSerializer, TaskDocumentSerializer

TEMPLATE_DIR = '/mnt/data/1os/database/task_template'


def _parse_template(filepath):
    """Parse a .md template file into name + groups + tasks."""
    with open(filepath, encoding='utf-8') as f:
        content = f.read()
    name = ''
    groups = []
    current_group = None
    for line in content.splitlines():
        line = line.strip()
        if line.startswith('# '):
            name = line[2:].strip()
        elif line.startswith('## '):
            if current_group is not None:
                groups.append(current_group)
            current_group = {'group': line[3:].strip(), 'tasks': []}
        elif current_group is not None and line:
            m = re.match(r'^\d+\.\s+(.+)', line)
            if m:
                current_group['tasks'].append(m.group(1))
    if current_group is not None:
        groups.append(current_group)
    return {'name': name, 'groups': groups}


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def task_templates(request):
    """Return all parsed task templates from the template directory."""
    templates = []
    if os.path.isdir(TEMPLATE_DIR):
        for fname in sorted(os.listdir(TEMPLATE_DIR)):
            if fname.endswith('.md'):
                try:
                    data = _parse_template(os.path.join(TEMPLATE_DIR, fname))
                    data['slug'] = fname[:-3]
                    templates.append(data)
                except Exception:
                    pass
    return Response(templates)

MANAGER_ROLES = {'manager', 'admin', 'superadmin'}


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

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
    http_method_names = ['get', 'post', 'patch', 'delete']

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
    http_method_names = ['get', 'post', 'patch', 'delete']

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

