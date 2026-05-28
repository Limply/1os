from rest_framework import serializers
from .models import Company, Department, Team, Position, Site


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']
