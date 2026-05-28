from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Tenant, User, PermissionGroup


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['name', 'schema_name', 'domain', 'plan', 'created_at']
    search_fields = ['name', 'schema_name', 'domain']
    list_filter = ['plan']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'role', 'tenant', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    list_filter = ['role', 'is_active', 'tenant']
    ordering = ['email']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('first_name', 'last_name', 'avatar')}),
        ('Access', {'fields': ('tenant', 'role', 'is_active', 'is_staff', 'mfa_enabled')}),
    )
    add_fieldsets = (
        (None, {'fields': ('email', 'password1', 'password2', 'tenant', 'role')}),
    )


@admin.register(PermissionGroup)
class PermissionGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'is_active']
    search_fields = ['name']
    list_filter = ['tenant', 'is_active']
