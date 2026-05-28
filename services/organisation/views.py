from rest_framework import viewsets, permissions
from .models import Company, Department, Team, Position, Site
from .serializers import CompanySerializer, DepartmentSerializer, TeamSerializer, PositionSerializer, SiteSerializer


class TenantScopedMixin:
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(tenant=self.request.user.tenant, is_active=True)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class CompanyViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer


class DepartmentViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer


class TeamViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer


class PositionViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer


class SiteViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Site.objects.all()
    serializer_class = SiteSerializer
