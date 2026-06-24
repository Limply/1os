from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import TenantViewSet, UserViewSet, me, change_password, tenant_info

router = DefaultRouter()
router.register('tenants', TenantViewSet, basename='tenant')
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('tenant-info/', tenant_info, name='tenant-info'),
    path('me/', me, name='me'),
    path('change-password/', change_password, name='change-password'),
    path('', include(router.urls)),
]
