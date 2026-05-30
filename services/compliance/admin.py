from django.contrib import admin
from shared.admin import TenantModelAdmin
from .models import Licence, Incident


@admin.register(Licence)
class LicenceAdmin(TenantModelAdmin):
    list_display = ['name', 'type', 'licence_no', 'issuer', 'expiry_date', 'status', 'alert_days']
    search_fields = ['name', 'licence_no', 'issuer']
    list_filter = ['type', 'status']
    ordering = ['expiry_date']


@admin.register(Incident)
class IncidentAdmin(TenantModelAdmin):
    list_display = ['ref_no', 'type', 'severity', 'site', 'date', 'status']
    search_fields = ['ref_no', 'description']
    list_filter = ['type', 'severity', 'status']
    ordering = ['-date']
