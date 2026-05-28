from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LicenceViewSet, IncidentViewSet

router = DefaultRouter()
router.register('licences', LicenceViewSet, basename='licence')
router.register('incidents', IncidentViewSet, basename='incident')

urlpatterns = [path('', include(router.urls))]
