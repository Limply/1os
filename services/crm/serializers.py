from rest_framework import serializers
from services.organisation.models import Client
from .models import Contact, Lead, Interaction


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'client', 'name', 'position', 'phone', 'email', 'whatsapp', 'is_primary', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class InteractionSerializer(serializers.ModelSerializer):
    by_name = serializers.SerializerMethodField()

    class Meta:
        model = Interaction
        fields = ['id', 'lead', 'type', 'notes', 'date', 'by', 'by_name', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_by_name(self, obj):
        return obj.by.get_full_name() if obj.by else None


class LeadSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    interaction_count = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            'id', 'client', 'client_name', 'title', 'description',
            'status', 'source', 'estimated_value',
            'assigned_to', 'assigned_to_name',
            'next_follow_up', 'lost_reason',
            'interaction_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else None

    def get_interaction_count(self, obj):
        return obj.interactions.count()

    def get_client_name(self, obj):
        return obj.client.name


class ClientListSerializer(serializers.ModelSerializer):
    contact_count = serializers.SerializerMethodField()
    lead_count = serializers.SerializerMethodField()
    primary_contact = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = ['id', 'name', 'type', 'address', 'contact_count', 'lead_count', 'primary_contact', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_contact_count(self, obj):
        return obj.contacts.count()

    def get_lead_count(self, obj):
        return obj.leads.count()

    def get_primary_contact(self, obj):
        c = obj.contacts.filter(is_primary=True).first() or obj.contacts.first()
        if not c:
            return None
        return {'name': c.name, 'phone': c.phone, 'email': c.email}


class ClientSerializer(serializers.ModelSerializer):
    contacts = ContactSerializer(many=True, read_only=True)
    leads = LeadSerializer(many=True, read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'type', 'address', 'billing_address',
            'uen', 'gst_no', 'website',
            'contact_name', 'contact_email', 'contact_phone',
            'notes', 'contacts', 'leads', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
