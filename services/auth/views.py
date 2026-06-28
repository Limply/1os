from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Tenant, User
from .serializers import TenantSerializer, UserSerializer, UserCreateSerializer


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
    user = User.objects.select_related(
        'employee_profile__position',
        'employee_profile__department',
    ).get(pk=request.user.pk)
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


class UserViewSet(viewsets.ModelViewSet):
    """List and manage users within the current tenant."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return User.objects.select_related(
            'employee_profile__position',
            'employee_profile__department',
        ).order_by('first_name', 'last_name')

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer


