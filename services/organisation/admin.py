from django.contrib import admin
from .models import Company, Department, Team, Position, Site


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'uen', 'phone', 'email', 'gst_registered']
    search_fields = ['name', 'uen']


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'parent', 'head', 'tenant']
    search_fields = ['name', 'code']
    list_filter = ['tenant']


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'department', 'lead', 'tenant']
    search_fields = ['name']
    list_filter = ['tenant', 'department']


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ['title', 'department', 'level', 'tenant']
    search_fields = ['title']
    list_filter = ['tenant', 'department']


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'address', 'postal_code', 'contact_name', 'tenant']
    search_fields = ['name', 'address', 'contact_name']
    list_filter = ['type', 'tenant']
