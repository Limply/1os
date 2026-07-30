import os
import re
from django.http import FileResponse, Http404
from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from shared import nas
from .models import Project, Task, TaskPhoto, TaskDocument, TaskComment, ProjectComment, DailyReport, WSHPhoto, _generate_project_no
from .serializers import ProjectSerializer, ProjectListSerializer, TaskSerializer, TaskPhotoSerializer, TaskDocumentSerializer, TaskCommentSerializer, ProjectCommentSerializer, DailyReportSerializer, WSHPhotoSerializer

TEMPLATE_DIR = '/mnt/data/1os/database/task_template'
from shared.permissions import user_can, P


def _file_entry(path, folder):
    """Serialise one entry in a project's NAS folder for the Files panel."""
    import datetime
    st = path.stat()
    is_dir = path.is_dir()
    return {
        'name': path.name,
        'is_dir': is_dir,
        'size': 0 if is_dir else st.st_size,
        'modified': datetime.datetime.fromtimestamp(st.st_mtime).isoformat(timespec='seconds'),
    }


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

from shared.permissions import user_can, P


FINANCIAL_FIELDS = {'payment_record'}


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Project.objects.order_by('-created_at')
        project_no = self.request.query_params.get('project_no')
        client_name = self.request.query_params.get('client_name')
        if project_no:
            qs = qs.filter(project_no=project_no)
        if client_name:
            qs = qs.filter(client_name__icontains=client_name)
        return qs

    @action(detail=False, methods=['get'])
    def next_no(self, request):
        return Response({'project_no': _generate_project_no()})

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser])
    def files(self, request, pk=None):
        """GET: list files in the project's NAS folder. POST: upload a file into it."""
        from .signals import project_folder_path, ensure_project_folder

        if request.method == 'POST':
            upload = request.FILES.get('file')
            if not upload:
                return Response({'detail': 'No file provided.'}, status=400)
            try:
                folder = ensure_project_folder(self.get_object())
                saved = nas.save_into(folder, upload.name, upload)
            except Exception as exc:
                return Response({'detail': f'Upload failed: {exc}'}, status=500)
            return Response(_file_entry(saved, folder), status=201)

        folder = project_folder_path(self.get_object())
        if not folder.exists():
            return Response([])
        entries = [_file_entry(p, folder) for p in sorted(folder.iterdir(), key=lambda x: x.name.lower())]
        return Response(entries)

    @action(detail=True, methods=['get'], url_path='files/download')
    def file_download(self, request, pk=None):
        """Stream one file from the project's NAS folder (top-level only)."""
        from .signals import project_folder_path
        name = request.query_params.get('name', '')
        try:
            safe = nas.sanitize_segment(name)
        except ValueError:
            raise Http404
        folder = project_folder_path(self.get_object())
        target = folder / safe
        if not target.is_file() or folder not in target.resolve().parents:
            raise Http404
        return FileResponse(open(target, 'rb'), as_attachment=True, filename=safe)

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        serializer.save()

    def partial_update(self, request, *args, **kwargs):
        if not user_can(request.user, P.FINANCE_EDIT):
            touching_finance = FINANCIAL_FIELDS & set(request.data.keys())
            if touching_finance:
                from rest_framework.response import Response
                from rest_framework import status
                return Response(
                    {'detail': 'Only admin users can edit financial fields.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return super().partial_update(request, *args, **kwargs)


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
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        if not user_can(request.user, P.PROJECTS_DELETE):
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
            uploaded_by=self.request.user,
        )


class TaskCommentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaskCommentSerializer
    pagination_class = None
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        qs = TaskComment.objects.select_related('author')
        task_id = self.request.query_params.get('task')
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            author=self.request.user,
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.author != request.user and not user_can(request.user, P.PROJECTS_DELETE):
            raise PermissionDenied('You can only delete your own comments.')
        return super().destroy(request, *args, **kwargs)


class ProjectCommentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProjectCommentSerializer
    pagination_class = None

    def get_queryset(self):
        qs = ProjectComment.objects.select_related('author')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            author=self.request.user,
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.author != request.user and not user_can(request.user, P.PROJECTS_DELETE):
            raise PermissionDenied('You can only delete your own comments.')
        return super().destroy(request, *args, **kwargs)


class DailyReportViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class   = DailyReportSerializer
    pagination_class   = None

    def get_queryset(self):
        qs = DailyReport.objects.select_related('project', 'submitted_by')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        elif not user_can(self.request.user, P.PROJECTS_VIEW):
            qs = qs.filter(submitted_by=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)


class WSHPhotoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class   = WSHPhotoSerializer
    pagination_class   = None

    def get_queryset(self):
        qs = WSHPhoto.objects.select_related('project', 'submitted_by')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        elif not user_can(self.request.user, P.PROJECTS_VIEW):
            qs = qs.filter(submitted_by=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)
