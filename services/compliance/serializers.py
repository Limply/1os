from rest_framework import serializers
from .models import Licence, Incident


class LicenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Licence
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']
