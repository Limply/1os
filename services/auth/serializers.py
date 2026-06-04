from rest_framework import serializers
from .models import Tenant, User, PermissionGroup


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'schema_name', 'domain', 'plan', 'modules', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'tenant_id', 'tenant_name', 'email', 'first_name', 'last_name',
            'role', 'is_active', 'mfa_enabled', 'avatar', 'modules', 'created_at',
        ]
        read_only_fields = ['id', 'tenant_name', 'created_at']


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
