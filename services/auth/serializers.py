from rest_framework import serializers
from .models import Tenant, User


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
    tenant_name    = serializers.CharField(source='tenant.name', read_only=True)
    permissions    = serializers.SerializerMethodField()
    position_title = serializers.SerializerMethodField()
    position_level = serializers.SerializerMethodField()
    department     = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'tenant_id', 'tenant_name', 'email', 'first_name', 'last_name',
            'role', 'permissions', 'position_title', 'position_level', 'department',
            'is_active', 'mfa_enabled', 'avatar', 'modules', 'preferences', 'created_at',
        ]
        read_only_fields = ['id', 'tenant_name', 'permissions', 'position_title', 'position_level', 'department', 'created_at']

    def get_permissions(self, obj):
        return obj.resolved_permissions

    def get_position_title(self, obj):
        try:
            return obj.employee_profile.position.title
        except Exception:
            return None

    def get_position_level(self, obj):
        try:
            return obj.employee_profile.position.level
        except Exception:
            return None

    def get_department(self, obj):
        try:
            return obj.employee_profile.department.name
        except Exception:
            return None


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name', 'role', 'tenant']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


