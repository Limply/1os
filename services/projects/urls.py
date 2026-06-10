from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TaskViewSet, TaskPhotoViewSet, TaskDocumentViewSet, task_templates

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('tasks', TaskViewSet, basename='task')
router.register('task-photos', TaskPhotoViewSet, basename='task-photo')
router.register('task-documents', TaskDocumentViewSet, basename='task-document')

urlpatterns = [
    path('', include(router.urls)),
    path('task-templates/', task_templates, name='task-templates'),
]
