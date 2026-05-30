from django.contrib import admin
from shared.admin import TenantModelAdmin
from .models import Job, WTSRequest, Asset, Inspection


@admin.register(Job)
class JobAdmin(TenantModelAdmin):
    list_display = ['job_no', 'title', 'type', 'status', 'priority', 'site', 'scheduled_date']
    search_fields = ['job_no', 'title', 'client_name']
    list_filter = ['type', 'status', 'priority']
    ordering = ['-created_at']


@admin.register(WTSRequest)
class WTSRequestAdmin(TenantModelAdmin):
    list_display = ['ref_no', 'site', 'lift_no', 'test_date', 'delivery_status', 'result']
    search_fields = ['ref_no', 'lift_no']
    list_filter = ['delivery_status', 'result']
    ordering = ['-test_date']


@admin.register(Asset)
class AssetAdmin(TenantModelAdmin):
    list_display = ['name', 'type', 'serial_no', 'brand', 'status', 'assigned_to', 'next_service']
    search_fields = ['name', 'serial_no', 'brand', 'model']
    list_filter = ['type', 'status']
    ordering = ['name']


@admin.register(Inspection)
class InspectionAdmin(TenantModelAdmin):
    list_display = ['type', 'site', 'date', 'inspector', 'result', 'next_due']
    search_fields = ['type']
    list_filter = ['result']
    ordering = ['-date']
