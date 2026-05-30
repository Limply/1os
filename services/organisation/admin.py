from django.contrib import admin
from shared.admin import TenantModelAdmin
from .models import Company, Department, Team, Position, Site


@admin.register(Company)
class CompanyAdmin(TenantModelAdmin):
    list_display = ['name', 'uen', 'phone', 'email', 'gst_registered']
    search_fields = ['name', 'uen']


@admin.register(Department)
class DepartmentAdmin(TenantModelAdmin):
    list_display = ['name', 'code', 'parent', 'head', 'tenant']
    search_fields = ['name', 'code']
    list_filter = ['tenant']


@admin.register(Team)
class TeamAdmin(TenantModelAdmin):
    list_display = ['name', 'department', 'lead', 'tenant']
    search_fields = ['name']
    list_filter = ['tenant', 'department']


@admin.register(Position)
class PositionAdmin(TenantModelAdmin):
    list_display = ['title', 'department', 'level', 'tenant']
    search_fields = ['title']
    list_filter = ['tenant', 'department']


@admin.register(Site)
class SiteAdmin(TenantModelAdmin):
    list_display = ['name', 'type', 'address', 'postal_code', 'contact_name', 'tenant']
    search_fields = ['name', 'address', 'contact_name']
    list_filter = ['type', 'tenant']
