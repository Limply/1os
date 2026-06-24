from django.http import FileResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from shared.permissions import make_module_permission, P

OpsPermission = make_module_permission(P.OPERATIONS_VIEW, P.OPERATIONS_EDIT)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import (
    Job, WTSRequest, Asset, Inspection,
    ServiceJob, ServiceReportItem, ServiceReportPhoto, InvoiceLineItem,
)
from .serializers import (
    JobSerializer, WTSRequestSerializer, AssetSerializer, InspectionSerializer,
    ServiceJobSerializer, ServiceReportItemSerializer, ServiceReportPhotoSerializer,
    InvoiceLineItemSerializer,
)
from . import documents


class TenantScopedMixin:
    permission_classes = [OpsPermission]

    def get_queryset(self):
        return self.queryset.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save()


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


class ServiceJobViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = (
        ServiceJob.objects
        .select_related('client', 'site', 'created_by')
        .prefetch_related('report_items', 'line_items')
    )
    serializer_class = ServiceJobSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def docx(self, request, pk=None):
        job = self.get_object()
        buf = documents.build_docx(job, getattr(request.user, 'tenant', None))
        resp = FileResponse(
            buf,
            as_attachment=True,
            filename=f"{job.service_number}.docx",
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        return resp

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        job = self.get_object()
        buf = documents.build_pdf(job, getattr(request.user, 'tenant', None))
        return FileResponse(
            buf,
            as_attachment=True,
            filename=f"{job.service_number}.pdf",
            content_type='application/pdf',
        )


class ServiceReportItemViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = ServiceReportItem.objects.select_related('job')
    serializer_class = ServiceReportItemSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        job = self.request.query_params.get('job')
        return qs.filter(job=job) if job else qs


class InvoiceLineItemViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = InvoiceLineItem.objects.select_related('job')
    serializer_class = InvoiceLineItemSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        job = self.request.query_params.get('job')
        return qs.filter(job=job) if job else qs


class ServiceReportPhotoViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = ServiceReportPhoto.objects.select_related('item')
    serializer_class = ServiceReportPhotoSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = super().get_queryset()
        item = self.request.query_params.get('item')
        return qs.filter(item=item) if item else qs
