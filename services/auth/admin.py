from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from .models import Tenant, User, PermissionGroup

ALL_MODULES = [
    ('dashboard',   'Dashboard'),
    ('orgchart',    'Org Chart'),
    ('projects',    'Projects'),
    ('calendar',    'Project Calendar'),
    ('hr',          'HR'),
    ('schedules',   'Schedules'),
    ('operations',  'Operations'),
    ('finance',     'Finance'),
    ('compliance',  'Compliance'),
    ('files',       'Files'),
]


class UserModulesForm(forms.ModelForm):
    module_access = forms.MultipleChoiceField(
        choices=ALL_MODULES,
        widget=forms.CheckboxSelectMultiple,
        required=False,
        label='Module Access',
        help_text='Tick which modules this user can see in the app.',
    )

    class Meta:
        model = User
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['module_access'].initial = self.instance.modules or []

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.modules = self.cleaned_data.get('module_access', [])
        if commit:
            instance.save()
        return instance


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['name', 'schema_name', 'domain', 'plan', 'created_at']
    search_fields = ['name', 'schema_name', 'domain']
    list_filter = ['plan']

    def has_module_permission(self, request):
        """Only superusers can see/manage tenants."""
        return request.user.is_superuser


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserModulesForm
    list_display = ['email', 'first_name', 'last_name', 'role', 'tenant', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    list_filter = ['role', 'is_active', 'tenant']
    ordering = ['email']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('first_name', 'last_name', 'avatar')}),
        ('Access', {'fields': ('tenant', 'role', 'is_active', 'is_staff', 'mfa_enabled')}),
        ('Module Access', {'fields': ('module_access',), 'description': 'Select which modules this user can see in the app.'}),
    )
    add_fieldsets = (
        (None, {'fields': ('email', 'password1', 'password2', 'tenant', 'role')}),
    )

    def get_queryset(self, request):
        """Tenant admins only see users from their own tenant."""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(tenant=request.user.tenant)

    def has_module_permission(self, request):
        """Tenant admins can manage users in their tenant."""
        if request.user.is_superuser:
            return True
        if request.user.role in ('admin', 'superadmin'):
            return True
        return False

    def get_model_perms(self, request):
        """Grant all perms to tenant admins."""
        if request.user.is_superuser:
            return super().get_model_perms(request)
        if request.user.role in ('admin', 'superadmin'):
            return {'add': True, 'change': True, 'delete': True, 'view': True}
        return super().get_model_perms(request)


@admin.register(PermissionGroup)
class PermissionGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'is_active']
    search_fields = ['name']
    list_filter = ['tenant', 'is_active']

    def has_module_permission(self, request):
        """Only superusers can see/manage permission groups."""
        return request.user.is_superuser


# Unregister and re-register Django's Group with proper tenant permissions
admin.site.unregister(Group)

@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    """Django's built-in Group with tenant scoping."""
    list_display = ['name']
    search_fields = ['name']

    def has_module_permission(self, request):
        """Tenant admins can manage groups in their tenant."""
        if request.user.is_superuser:
            return True
        if request.user.role in ('admin', 'superadmin'):
            return True
        return False

    def get_model_perms(self, request):
        """Grant all perms to tenant admins."""
        if request.user.is_superuser:
            return super().get_model_perms(request)
        if request.user.role in ('admin', 'superadmin'):
            return {'add': True, 'change': True, 'delete': True, 'view': True}
        return super().get_model_perms(request)
