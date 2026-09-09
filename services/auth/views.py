from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from shared.permissions import P, user_can
from .models import Tenant, User
from .serializers import TenantSerializer, UserSerializer, UserCreateSerializer


def user_queryset():
    """Base user queryset. `services.hr` is optional — 1Farm ships without it, so
    the employee_profile reverse relation may be absent. Only join when it exists."""
    qs = User.objects.all()
    if hasattr(User, 'employee_profile'):
        qs = qs.select_related('employee_profile__position', 'employee_profile__department')
    return qs


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def tenant_info(request):
    t = Tenant.objects.first()
    if not t:
        return Response({})
    return Response({
        'name': t.name,
        'address': t.address,
        'phone': t.phone,
        'email': t.email,
        'uen': t.uen,
        'gst_number': t.gst_number,
        'gst_registered': t.gst_registered,
        'site_url': t.site_url,
        'files_url': t.files_url,
        'logo': t.logo,
        'modules': t.modules,
        'project_prefix': t.project_prefix,
        'signatory_name': t.signatory_name,
        'signatory_designation': t.signatory_designation,
        'signatory_file': request.build_absolute_uri(t.signatory_file.url) if t.signatory_file else None,
    })


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    user = user_queryset().get(pk=request.user.pk)
    if request.method == 'PATCH':
        allowed = {'preferences', 'first_name', 'last_name', 'avatar'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        for k, v in data.items():
            setattr(user, k, v)
        user.save(update_fields=list(data.keys()))
    return Response(UserSerializer(user).data)


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
    """CRUD for tenants. Company fields are editable by staff/admins; changing the
    enabled `modules` (plan entitlement) is restricted to superadmins."""
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAdminUser]

    def update(self, request, *args, **kwargs):
        # Covers PATCH too (partial_update delegates to update()).
        if 'modules' in request.data and getattr(request.user, 'role', None) != 'superadmin':
            return Response({'detail': 'Only a superadmin can change modules.'}, status=403)
        return super().update(request, *args, **kwargs)


class CanManageUsers(permissions.BasePermission):
    """Any signed-in user may read the user list — assignee pickers need it.
    Creating, editing and deactivating accounts requires `admin.users`."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user_can(request.user, P.ADMIN_USERS)


class UserViewSet(viewsets.ModelViewSet):
    """List and manage users within the current tenant."""
    serializer_class = UserSerializer
    permission_classes = [CanManageUsers]
    pagination_class = None

    def get_queryset(self):
        return user_queryset().order_by('first_name', 'last_name')

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def _guard(self, target, data):
        """Stop an admin locking themselves out, and keep superadmin above admin."""
        actor = self.request.user
        if target is not None and target.pk == actor.pk:
            if 'role' in data and data['role'] != target.role:
                raise PermissionDenied('You cannot change your own role.')
            if 'is_active' in data and not data['is_active']:
                raise PermissionDenied('You cannot deactivate your own account.')
        if actor.role != 'superadmin':
            if target is not None and target.role == 'superadmin':
                raise PermissionDenied('Only a superadmin can edit a superadmin account.')
            if data.get('role') == 'superadmin':
                raise PermissionDenied('Only a superadmin can grant the superadmin role.')

    def perform_create(self, serializer):
        self._guard(None, self.request.data)
        serializer.save()

    def update(self, request, *args, **kwargs):
        self._guard(self.get_object(), request.data)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        target = self.get_object()
        if target.pk == request.user.pk:
            raise PermissionDenied('You cannot delete your own account.')
        self._guard(target, {})
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='set-password')
    def set_password(self, request, pk=None):
        """Admin sets another user's password directly — no current password needed."""
        target = self.get_object()
        self._guard(target, {})
        new = request.data.get('new_password', '')
        try:
            validate_password(new, target)
        except DjangoValidationError as e:
            return Response({'new_password': list(e.messages)}, status=400)
        target.set_password(new)
        target.save(update_fields=['password'])
        return Response({'success': True})


