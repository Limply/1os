from rest_framework import serializers
from .models import Tenant, User, PermissionGroup


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'site_url', 'logo', 'address', 'phone', 'email',
            'uen', 'gst_registered', 'gst_number', 'modules', 'project_prefix',
            'signatory_name', 'signatory_designation', 'signatory_file',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'tenant_id', 'tenant_name', 'email', 'first_name', 'last_name',
            'role', 'permissions', 'is_active', 'mfa_enabled', 'avatar', 'modules',
            'preferences', 'created_at',
        ]
        read_only_fields = ['id', 'tenant_name', 'permissions', 'created_at']

    def get_permissions(self, obj):
        # superadmin returns None — frontend can() treats None as all-access
        return obj.resolved_permissions


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name', 'role', 'tenant']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class PermissionGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermissionGroup
        fields = ['id', 'tenant_id', 'name', 'permissions', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
