from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TaskListViewSet, TaskViewSet

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('task-lists', TaskListViewSet, basename='tasklist')
router.register('tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
]
