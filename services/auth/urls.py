from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import TenantViewSet, UserViewSet, PermissionGroupViewSet

router = DefaultRouter()
router.register('tenants', TenantViewSet, basename='tenant')
router.register('users', UserViewSet, basename='user')
router.register('permission-groups', PermissionGroupViewSet, basename='permission-group')

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]
