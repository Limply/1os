from rest_framework import serializers
from .models import Quotation, QuotationItem, Invoice, InvoiceItem, Payment, DeliveryOrder, DeliveryOrderItem


class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        exclude = ['tenant']
        read_only_fields = ['id', 'amount', 'created_at', 'updated_at']


class QuotationSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True, read_only=True)

    class Meta:
        model = Quotation
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        exclude = ['tenant']
        read_only_fields = ['id', 'amount', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    balance_due = serializers.ReadOnlyField()

    class Meta:
        model = Invoice
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeliveryOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryOrderItem
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeliveryOrderSerializer(serializers.ModelSerializer):
    items = DeliveryOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = DeliveryOrder
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']
