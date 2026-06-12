from rest_framework import viewsets, permissions
from .models import Client, Contact, Lead, Interaction
from .serializers import (
    ClientSerializer, ClientListSerializer,
    ContactSerializer, LeadSerializer, InteractionSerializer,
)


class ClientViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Client.objects.order_by('name')

    def get_serializer_class(self):
        if self.action == 'list':
            return ClientListSerializer
        return ClientSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class ContactViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ContactSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Contact.objects.all()
        client_id = self.request.query_params.get('client')
        if client_id:
            qs = qs.filter(client_id=client_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class LeadViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LeadSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Lead.objects.select_related('client', 'assigned_to')
        client_id = self.request.query_params.get('client')
        status    = self.request.query_params.get('status')
        assigned  = self.request.query_params.get('assigned_to')
        if client_id:
            qs = qs.filter(client_id=client_id)
        if status:
            qs = qs.filter(status=status)
        if assigned:
            qs = qs.filter(assigned_to_id=assigned)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class InteractionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InteractionSerializer
    pagination_class = None

    def get_queryset(self):
        lead_id = self.request.query_params.get('lead')
        qs = Interaction.objects.select_related('by')
        if lead_id:
            qs = qs.filter(lead_id=lead_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.user.tenant,
            by=self.request.user,
        )
