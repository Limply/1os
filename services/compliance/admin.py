from django.contrib import admin
from .models import Licence, Incident


@admin.register(Licence)
class LicenceAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'licence_no', 'issuer', 'expiry_date', 'status', 'alert_days']
    search_fields = ['name', 'licence_no', 'issuer']
    list_filter = ['type', 'status']
    ordering = ['expiry_date']


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ['ref_no', 'type', 'severity', 'site', 'date', 'status']
    search_fields = ['ref_no', 'description']
    list_filter = ['type', 'severity', 'status']
    ordering = ['-date']
