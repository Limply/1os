from django.contrib import admin


class TenantInlineMixin:
    pass


class TenantModelAdmin(admin.ModelAdmin):
    """Base admin class (single-tenant — no tenant assignment needed)."""
    pass