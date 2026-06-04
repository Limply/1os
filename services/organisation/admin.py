from django.contrib import admin
from shared.admin import TenantModelAdmin
from .models import Company, Department, Team, Position, Site, Client


@admin.register(Company)
class CompanyAdmin(TenantModelAdmin):
    list_display = ['name', 'uen', 'phone', 'email', 'gst_registered']
    search_fields = ['name', 'uen']


@admin.register(Department)
class DepartmentAdmin(TenantModelAdmin):
    list_display = ['name', 'code', 'parent', 'head']
    search_fields = ['name', 'code']
    list_filter = []


@admin.register(Team)
class TeamAdmin(TenantModelAdmin):
    list_display = ['name', 'department', 'lead']
    search_fields = ['name']
    list_filter = ['department']


@admin.register(Position)
class PositionAdmin(TenantModelAdmin):
    list_display = ['title', 'department', 'level']
    search_fields = ['title']
    list_filter = ['department']


@admin.register(Site)
class SiteAdmin(TenantModelAdmin):
    list_display = ['name', 'type', 'address', 'postal_code', 'contact_name']
    search_fields = ['name', 'address', 'contact_name']
    list_filter = ['type']


@admin.register(Client)
class ClientAdmin(TenantModelAdmin):
    list_display = ['name', 'uen', 'contact_name', 'contact_email', 'contact_phone']
    search_fields = ['name', 'uen', 'contact_name', 'contact_email']
    ordering = ['name']
