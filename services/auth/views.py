from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Tenant, User, PermissionGroup
from .serializers import TenantSerializer, UserSerializer, UserCreateSerializer, PermissionGroupSerializer


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


class TenantViewSet(viewsets.ModelViewSet):
    """CRUD for tenants. Superadmin only."""
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAdminUser]


class UserViewSet(viewsets.ModelViewSet):
    """List and manage users within the current tenant."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(tenant=self.request.user.tenant)

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer


class PermissionGroupViewSet(viewsets.ModelViewSet):
    """Permission group management."""
    serializer_class = PermissionGroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PermissionGroup.objects.filter(tenant=self.request.user.tenant)
