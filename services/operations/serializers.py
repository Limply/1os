from rest_framework import serializers
from .models import Job, WTSRequest, Asset, Inspection


class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class WTSRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = WTSRequest
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class InspectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inspection
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']
