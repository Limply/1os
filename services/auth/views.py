from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Tenant, User, PermissionGroup
from .serializers import TenantSerializer, UserSerializer, UserCreateSerializer, PermissionGroupSerializer


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def tenant_info(request):
    tenant = Tenant.objects.first()
    return Response({'name': tenant.name if tenant else ''})


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    if request.method == 'PATCH':
        allowed = {'preferences', 'first_name', 'last_name', 'avatar'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        for k, v in data.items():
            setattr(request.user, k, v)
        request.user.save(update_fields=list(data.keys()))
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    user = request.user
    current = request.data.get('current_password', '')
    new = request.data.get('new_password', '')
    confirm = request.data.get('confirm_password', '')

    if not user.check_password(current):
        return Response({'error': 'Current password is incorrect'}, status=400)
    if len(new) < 8:
        return Response({'error': 'New password must be at least 8 characters'}, status=400)
    if new != confirm:
        return Response({'error': 'Passwords do not match'}, status=400)

    user.set_password(new)
    user.save()
    return Response({'success': True, 'message': 'Password changed successfully'})


class TenantViewSet(viewsets.ModelViewSet):
    """CRUD for tenants. Superadmin only."""
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAdminUser]


class UserViewSet(viewsets.ModelViewSet):
    """List and manage users within the current tenant."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return User.objects.all().order_by('first_name', 'last_name')

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer


class PermissionGroupViewSet(viewsets.ModelViewSet):
    """Permission group management."""
    serializer_class = PermissionGroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PermissionGroup.objects.all()
