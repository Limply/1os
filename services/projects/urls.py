from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TaskViewSet, TaskPhotoViewSet, TaskDocumentViewSet, TaskCommentViewSet, ProjectCommentViewSet, DailyReportViewSet, WSHPhotoViewSet, task_templates

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('tasks', TaskViewSet, basename='task')
router.register('task-photos', TaskPhotoViewSet, basename='task-photo')
router.register('task-documents', TaskDocumentViewSet, basename='task-document')
router.register('task-comments', TaskCommentViewSet, basename='task-comment')
router.register('project-comments', ProjectCommentViewSet, basename='project-comment')
router.register('daily-reports', DailyReportViewSet, basename='daily-report')
router.register('wsh-photos',    WSHPhotoViewSet,    basename='wsh-photo')

urlpatterns = [
    path('', include(router.urls)),
    path('task-templates/', task_templates, name='task-templates'),
]
