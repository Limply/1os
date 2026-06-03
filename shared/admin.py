from django.contrib import admin


class TenantModelAdmin(admin.ModelAdmin):
    """Base admin that auto-sets tenant from the logged-in user on save."""

    def save_model(self, request, obj, form, change):
        if not obj.tenant_id:
            obj.tenant = request.user.tenant
        super().save_model(request, obj, form, change)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(tenant=request.user.tenant)

    def has_module_perms(self, request):
        """Tenant admins (role='admin') see module if they have any perms."""
        if request.user.is_superuser:
            return True
        if request.user.role in ('admin', 'superadmin'):
            return True
        return False

    def has_view_permission(self, request, obj=None):
        """Tenant admins can view all objects in their tenant."""
        if request.user.is_superuser:
            return True
        if request.user.role in ('admin', 'superadmin'):
            return True
        return super().has_view_permission(request, obj)

    def has_add_permission(self, request):
        """Tenant admins can add objects."""
        if request.user.is_superuser:
            return True
        if request.user.role in ('admin', 'superadmin'):
            return True
        return super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        """Tenant admins can edit objects."""
        if request.user.is_superuser:
            return True
        if request.user.role in ('admin', 'superadmin'):
            return True
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        """Tenant admins can delete objects."""
        if request.user.is_superuser:
            return True
        if request.user.role in ('admin', 'superadmin'):
            return True
        return super().has_delete_permission(request, obj)

    def formfield_for_foreignkey(self, db_field, request=None, **kwargs):
        """Filter FK dropdowns to current tenant for non-superusers."""
        if request and not request.user.is_superuser:
            # Filter the queryset for this FK to the user's tenant
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(tenant=request.user.tenant)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)