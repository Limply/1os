from rest_framework import viewsets, permissions
from .models import Licence, Incident
from .serializers import LicenceSerializer, IncidentSerializer
from shared.permissions import make_module_permission, P

CompliancePermission = make_module_permission(P.COMPLIANCE_VIEW, P.COMPLIANCE_EDIT)


class TenantScopedMixin:
    permission_classes = [CompliancePermission]

    def get_queryset(self):
        return self.queryset.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save()


class LicenceViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Licence.objects.all()
    serializer_class = LicenceSerializer


class IncidentViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Incident.objects.select_related('site', 'reported_by')
    serializer_class = IncidentSerializer
