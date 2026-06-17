from rest_framework import serializers
from .models import Quotation, QuotationItem, Invoice, InvoiceItem, Payment, DeliveryOrder, DeliveryOrderItem, Expense


class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        fields = '__all__'
        read_only_fields = ['id', 'amount', 'created_at', 'updated_at']


class QuotationSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True, read_only=True)

    class Meta:
        model = Quotation
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = '__all__'
        read_only_fields = ['id', 'amount', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    balance_due = serializers.ReadOnlyField()

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeliveryOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryOrderItem
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeliveryOrderSerializer(serializers.ModelSerializer):
    items = DeliveryOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = DeliveryOrder
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExpenseSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['id', 'recorded_by', 'created_at', 'updated_at']

    def get_recorded_by_name(self, obj):
        return obj.recorded_by.full_name if obj.recorded_by else None
