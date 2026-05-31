from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    QuotationViewSet, QuotationItemViewSet,
    InvoiceViewSet, InvoiceItemViewSet, PaymentViewSet,
    DeliveryOrderViewSet, DeliveryOrderItemViewSet,
)

router = DefaultRouter()
router.register('quotations', QuotationViewSet, basename='quotation')
router.register('quotation-items', QuotationItemViewSet, basename='quotation-item')
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('invoice-items', InvoiceItemViewSet, basename='invoice-item')
router.register('payments', PaymentViewSet, basename='payment')
router.register('delivery-orders', DeliveryOrderViewSet, basename='delivery-order')
router.register('delivery-order-items', DeliveryOrderItemViewSet, basename='delivery-order-item')

urlpatterns = [path('', include(router.urls))]
