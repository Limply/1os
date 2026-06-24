from rest_framework import viewsets, permissions
from .models import Company, Department, Team, Position, Site, Client
from .serializers import CompanySerializer, DepartmentSerializer, TeamSerializer, PositionSerializer, SiteSerializer, ClientSerializer
from shared.permissions import make_module_permission, P

OrgPermission = make_module_permission(P.HR_VIEW, P.HR_MANAGE)
CRMPermission = make_module_permission(P.CRM_VIEW, P.CRM_EDIT)


class TenantScopedMixin:
    permission_classes = [OrgPermission]

    def get_queryset(self):
        return self.queryset.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save()


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


class ClientViewSet(viewsets.ModelViewSet):
    permission_classes = [CRMPermission]
    serializer_class = ClientSerializer

    def get_queryset(self):
        qs = Client.objects.filter(is_active=True)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by('name')
