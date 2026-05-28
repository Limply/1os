from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']
