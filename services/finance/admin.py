from django.contrib import admin
from shared.admin import TenantModelAdmin
from .models import Quotation, QuotationItem, Invoice, InvoiceItem, Payment


class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 0
    fields = ['description', 'item_type', 'unit', 'qty', 'unit_price', 'amount', 'sort_order']
    readonly_fields = ['amount']


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    fields = ['description', 'item_type', 'unit', 'qty', 'unit_price', 'amount', 'sort_order']
    readonly_fields = ['amount']


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    fields = ['payment_date', 'amount', 'method', 'reference']


@admin.register(Quotation)
class QuotationAdmin(TenantModelAdmin):
    list_display = ['quote_no', 'client_name', 'status', 'issue_date', 'valid_until', 'total']
    search_fields = ['quote_no', 'client_name', 'client_email']
    list_filter = ['status']
    ordering = ['-issue_date']
    inlines = [QuotationItemInline]


@admin.register(Invoice)
class InvoiceAdmin(TenantModelAdmin):
    list_display = ['invoice_no', 'client_name', 'status', 'issue_date', 'due_date', 'total', 'paid_amount']
    search_fields = ['invoice_no', 'client_name', 'client_email']
    list_filter = ['status', 'payment_method']
    ordering = ['-issue_date']
    inlines = [InvoiceItemInline, PaymentInline]


@admin.register(Payment)
class PaymentAdmin(TenantModelAdmin):
    list_display = ['invoice', 'amount', 'payment_date', 'method', 'reference']
    search_fields = ['invoice__invoice_no', 'reference']
    list_filter = ['method']
    ordering = ['-payment_date']
