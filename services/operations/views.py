from rest_framework import viewsets, permissions
from .models import Job, WTSRequest, Asset, Inspection
from .serializers import JobSerializer, WTSRequestSerializer, AssetSerializer, InspectionSerializer


class TenantScopedMixin:
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(tenant=self.request.user.tenant, is_active=True)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class JobViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Job.objects.select_related('site')
    serializer_class = JobSerializer


class WTSRequestViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = WTSRequest.objects.select_related('site', 'driver', 'job')
    serializer_class = WTSRequestSerializer


class AssetViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Asset.objects.select_related('assigned_to', 'location')
    serializer_class = AssetSerializer


class InspectionViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Inspection.objects.select_related('site', 'inspector', 'job')
    serializer_class = InspectionSerializer
