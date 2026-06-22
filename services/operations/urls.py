from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JobViewSet, WTSRequestViewSet, AssetViewSet, InspectionViewSet,
    ServiceJobViewSet, ServiceReportItemViewSet, ServiceReportPhotoViewSet,
    InvoiceLineItemViewSet,
)

router = DefaultRouter()
router.register('jobs', JobViewSet, basename='job')
router.register('wts', WTSRequestViewSet, basename='wts')
router.register('assets', AssetViewSet, basename='asset')
router.register('inspections', InspectionViewSet, basename='inspection')
router.register('service-jobs', ServiceJobViewSet, basename='service-job')
router.register('service-report-items', ServiceReportItemViewSet, basename='service-report-item')
router.register('service-report-photos', ServiceReportPhotoViewSet, basename='service-report-photo')
router.register('invoice-line-items', InvoiceLineItemViewSet, basename='invoice-line-item')

urlpatterns = [path('', include(router.urls))]
