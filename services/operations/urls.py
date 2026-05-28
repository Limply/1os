from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobViewSet, WTSRequestViewSet, AssetViewSet, InspectionViewSet

router = DefaultRouter()
router.register('jobs', JobViewSet, basename='job')
router.register('wts', WTSRequestViewSet, basename='wts')
router.register('assets', AssetViewSet, basename='asset')
router.register('inspections', InspectionViewSet, basename='inspection')

urlpatterns = [path('', include(router.urls))]
