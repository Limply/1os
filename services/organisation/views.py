from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
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

    @action(detail=False, methods=['post'])
    def import_from_projects(self, request):
        """Create/refresh a Location for every project that has site info,
        skipping projects with neither an address nor GPS coordinates."""
        from services.projects.models import Project

        projects = Project.objects.filter(is_active=True).filter(
            Q(site_address__isnull=False) & ~Q(site_address='') | Q(site_lat__isnull=False, site_lng__isnull=False)
        )

        created, updated, skipped = 0, 0, 0
        for proj in projects:
            site, was_created = Site.objects.get_or_create(project=proj, defaults={'name': proj.name})
            site.name = proj.name
            site.type = 'client_site'
            site.address = proj.site_address or site.address
            site.lat = proj.site_lat if proj.site_lat is not None else site.lat
            site.lng = proj.site_lng if proj.site_lng is not None else site.lng
            site.contact_name = proj.client_contact or site.contact_name
            site.contact_phone = proj.client_phone or site.contact_phone
            site.save()
            created += 1 if was_created else 0
            updated += 0 if was_created else 1

        total_projects = Project.objects.filter(is_active=True).count()
        skipped = total_projects - (created + updated)
        return Response({'created': created, 'updated': updated, 'skipped': skipped})


class ClientViewSet(viewsets.ModelViewSet):
    permission_classes = [CRMPermission]
    serializer_class = ClientSerializer

    def get_queryset(self):
        qs = Client.objects.filter(is_active=True)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by('name')
