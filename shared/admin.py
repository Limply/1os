from django.contrib import admin


class TenantModelAdmin(admin.ModelAdmin):
    """Base admin — auto-assigns tenant on save. Single-tenant: no filtering."""

    def save_model(self, request, obj, form, change):
        if not obj.tenant_id:
            obj.tenant = request.user.tenant
        super().save_model(request, obj, form, change)