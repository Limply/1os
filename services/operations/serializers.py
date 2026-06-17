from rest_framework import serializers
from .models import Job, WTSRequest, Asset, Inspection


class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class WTSRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = WTSRequest
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class InspectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inspection
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
