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