from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuotationViewSet, QuotationItemViewSet, InvoiceViewSet, InvoiceItemViewSet, PaymentViewSet

router = DefaultRouter()
router.register('quotations', QuotationViewSet, basename='quotation')
router.register('quotation-items', QuotationItemViewSet, basename='quotation-item')
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('invoice-items', InvoiceItemViewSet, basename='invoice-item')
router.register('payments', PaymentViewSet, basename='payment')

urlpatterns = [path('', include(router.urls))]
