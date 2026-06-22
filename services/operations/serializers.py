from rest_framework import serializers
from .models import (
    Job, WTSRequest, Asset, Inspection,
    ServiceJob, ServiceReportItem, ServiceReportPhoto, InvoiceLineItem,
)


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


class ServiceReportPhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ServiceReportPhoto
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url


class ServiceReportItemSerializer(serializers.ModelSerializer):
    photos = ServiceReportPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = ServiceReportItem
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class ServiceJobSerializer(serializers.ModelSerializer):
    report_items     = ServiceReportItemSerializer(many=True, read_only=True)
    line_items       = InvoiceLineItemSerializer(many=True, read_only=True)
    total_amount     = serializers.ReadOnlyField()
    client_name      = serializers.SerializerMethodField()
    created_by_name  = serializers.SerializerMethodField()

    class Meta:
        model = ServiceJob
        fields = '__all__'
        read_only_fields = ['id', 'service_number', 'created_by', 'created_at', 'updated_at']

    def get_client_name(self, obj):
        return obj.client.name if obj.client else None

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None
