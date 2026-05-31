import io
from django.http import HttpResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from .models import Quotation, QuotationItem, Invoice, InvoiceItem, Payment, DeliveryOrder, DeliveryOrderItem
from .serializers import (
    QuotationSerializer, QuotationItemSerializer,
    InvoiceSerializer, InvoiceItemSerializer, PaymentSerializer,
    DeliveryOrderSerializer, DeliveryOrderItemSerializer,
)


class TenantScopedMixin:
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(tenant=self.request.user.tenant, is_active=True)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


def _docx_response(doc, filename):
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    res = HttpResponse(buf, content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res['Content-Disposition'] = f'attachment; filename="{filename}"'
    return res


class QuotationViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Quotation.objects.prefetch_related('items')
    serializer_class = QuotationSerializer

    @action(detail=True, methods=['get'])
    def docx(self, request, pk=None):
        from shared.docx_generator import generate_quotation
        obj = self.get_object()
        return _docx_response(generate_quotation(obj), f'{obj.quote_no}.docx')


class QuotationItemViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = QuotationItem.objects.select_related('quotation')
    serializer_class = QuotationItemSerializer


class InvoiceViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Invoice.objects.prefetch_related('items', 'payments')
    serializer_class = InvoiceSerializer

    @action(detail=True, methods=['get'])
    def docx(self, request, pk=None):
        from shared.docx_generator import generate_invoice
        obj = self.get_object()
        return _docx_response(generate_invoice(obj), f'{obj.invoice_no}.docx')


class InvoiceItemViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = InvoiceItem.objects.select_related('invoice')
    serializer_class = InvoiceItemSerializer


class PaymentViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('invoice')
    serializer_class = PaymentSerializer


class DeliveryOrderViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = DeliveryOrder.objects.prefetch_related('items')
    serializer_class = DeliveryOrderSerializer

    @action(detail=True, methods=['get'])
    def docx(self, request, pk=None):
        from shared.docx_generator import generate_delivery_order
        obj = self.get_object()
        return _docx_response(generate_delivery_order(obj), f'{obj.do_no}.docx')


class DeliveryOrderItemViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = DeliveryOrderItem.objects.select_related('delivery_order')
    serializer_class = DeliveryOrderItemSerializer
