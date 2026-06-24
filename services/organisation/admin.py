from django import forms
from django.contrib import admin
from shared.admin import TenantModelAdmin
from shared.permissions import P
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


ALL_PERMISSIONS = [(p, p) for p in P.all()]


class PositionForm(forms.ModelForm):
    permission_flags = forms.MultipleChoiceField(
        choices=ALL_PERMISSIONS,
        widget=forms.CheckboxSelectMultiple,
        required=False,
        label='Permissions',
    )

    class Meta:
        model = Position
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['permission_flags'].initial = self.instance.permissions or []

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.permissions = self.cleaned_data.get('permission_flags', [])
        if commit:
            instance.save()
        return instance


@admin.register(Position)
class PositionAdmin(TenantModelAdmin):
    form = PositionForm
    list_display = ['title', 'department', 'level', 'permission_count']
    search_fields = ['title']
    list_filter = ['department']
    fieldsets = (
        (None, {'fields': ('title', 'department', 'level', 'is_active')}),
        ('Permissions', {'fields': ('permission_flags',), 'description': 'Select which permissions holders of this position receive.'}),
    )

    def permission_count(self, obj):
        return len(obj.permissions or [])
    permission_count.short_description = 'Permissions'


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
