from rest_framework import viewsets, permissions
from .models import Licence, Incident
from .serializers import LicenceSerializer, IncidentSerializer


class TenantScopedMixin:
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class LicenceViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Licence.objects.all()
    serializer_class = LicenceSerializer


class IncidentViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Incident.objects.select_related('site', 'reported_by')
    serializer_class = IncidentSerializer
