from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, DepartmentViewSet, TeamViewSet, PositionViewSet, SiteViewSet, ClientViewSet

router = DefaultRouter()
router.register('companies', CompanyViewSet, basename='company')
router.register('departments', DepartmentViewSet, basename='department')
router.register('teams', TeamViewSet, basename='team')
router.register('positions', PositionViewSet, basename='position')
router.register('sites', SiteViewSet, basename='site')
router.register('clients', ClientViewSet, basename='client')

urlpatterns = [path('', include(router.urls))]
