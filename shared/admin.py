from django.contrib import admin


def _is_tenant_admin(user):
    """True if user is an authenticated tenant admin (not anonymous)."""
    return user.is_authenticated and getattr(user, 'role', None) in ('admin', 'superadmin')


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
        return self.has_module_permission(request)

    def has_module_permission(self, request):
        if request.user.is_superuser:
            return True
        return _is_tenant_admin(request.user)

    def get_model_perms(self, request):
        if request.user.is_superuser:
            return super().get_model_perms(request)
        if _is_tenant_admin(request.user):
            return {'add': True, 'change': True, 'delete': True, 'view': True}
        return super().get_model_perms(request)

    def has_view_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return _is_tenant_admin(request.user)

    def has_add_permission(self, request):
        if request.user.is_superuser:
            return True
        return _is_tenant_admin(request.user)

    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return _is_tenant_admin(request.user)

    def has_delete_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return _is_tenant_admin(request.user)

    def formfield_for_foreignkey(self, db_field, request=None, **kwargs):
        if request and request.user.is_authenticated and not request.user.is_superuser:
            model = db_field.remote_field.model
            try:
                model._meta.get_field('tenant')
                kwargs['queryset'] = model.objects.filter(tenant=request.user.tenant)
            except Exception:
                pass
        return super().formfield_for_foreignkey(db_field, request, **kwargs)