from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
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


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserModulesForm
    list_display = ['email', 'first_name', 'last_name', 'role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    list_filter = ['role', 'is_active']
    ordering = ['email']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('first_name', 'last_name', 'avatar')}),
        ('Access', {'fields': ('tenant', 'role', 'is_active', 'is_staff', 'is_superuser', 'mfa_enabled')}),
        ('Module Access', {'fields': ('module_access',), 'description': 'Select which modules this user can see in the app.'}),
    )
    add_fieldsets = (
        (None, {'fields': ('email', 'password1', 'password2', 'tenant', 'role')}),
    )


@admin.register(PermissionGroup)
class PermissionGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active']
    search_fields = ['name']
