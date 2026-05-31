from django.db import models
from shared.models import BaseModel


class Quotation(BaseModel):
    """Customer quotation / bill of quantities."""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]

    quote_no = models.CharField(max_length=20, unique=True)
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField(blank=True, null=True)
    client_address = models.TextField(blank=True, null=True)
    site = models.ForeignKey(
        'organisation.Site', on_delete=models.SET_NULL, null=True, blank=True, related_name='quotations'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    issue_date = models.DateField()
    valid_until = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    prepared_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='quotations'
    )
    revision = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.quote_no} — {self.client_name}"


class QuotationItem(BaseModel):
    """Line item on a quotation."""
    ITEM_TYPES = [
        ('supply', 'Supply'),
        ('labour', 'Labour'),
        ('material', 'Material'),
        ('misc', 'Miscellaneous'),
    ]

    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    description = models.TextField()
    unit = models.CharField(max_length=20, blank=True, null=True, help_text='lot, pcs, m, etc.')
    qty = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES, default='supply')
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order']

    def __str__(self):
        return f"{self.quotation.quote_no} — {self.description[:50]}"

    def save(self, *args, **kwargs):
        self.amount = self.qty * self.unit_price
        super().save(*args, **kwargs)


class Invoice(BaseModel):
    """Customer invoice, optionally linked to a quotation."""
    STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('void', 'Void'),
    ]
    PAYMENT_METHODS = [
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('cash', 'Cash'),
        ('paynow', 'PayNow'),
    ]

    invoice_no = models.CharField(max_length=20, unique=True)
    quotation = models.ForeignKey(
        Quotation, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices'
    )
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unpaid')
    issue_date = models.DateField()
    due_date = models.DateField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.invoice_no} — {self.client_name}"

    @property
    def balance_due(self):
        return self.total - self.paid_amount


class InvoiceItem(BaseModel):
    """Line item on an invoice (copied from quotation or entered manually)."""
    ITEM_TYPES = [
        ('supply', 'Supply'),
        ('labour', 'Labour'),
        ('material', 'Material'),
        ('misc', 'Miscellaneous'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.TextField()
    unit = models.CharField(max_length=20, blank=True, null=True)
    qty = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES, default='supply')
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order']

    def __str__(self):
        return f"{self.invoice.invoice_no} — {self.description[:50]}"

    def save(self, *args, **kwargs):
        self.amount = self.qty * self.unit_price
        super().save(*args, **kwargs)


class DeliveryOrder(BaseModel):
    """Delivery order issued to client for goods/materials delivered on site."""
    STATUS_CHOICES = [
        ('draft',       'Draft'),
        ('issued',      'Issued'),
        ('delivered',   'Delivered'),
        ('acknowledged','Acknowledged'),
        ('cancelled',   'Cancelled'),
    ]

    do_no = models.CharField(max_length=20, unique=True)
    quotation = models.ForeignKey(
        Quotation, on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_orders'
    )
    invoice = models.ForeignKey(
        Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_orders'
    )
    client_name = models.CharField(max_length=255)
    delivery_address = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    issue_date = models.DateField()
    delivery_date = models.DateField(null=True, blank=True)
    delivered_by = models.CharField(max_length=255, blank=True, null=True, help_text='Driver or transporter name')
    received_by = models.CharField(max_length=255, blank=True, null=True, help_text='Person who received on site')
    notes = models.TextField(blank=True, null=True)
    prepared_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_orders'
    )

    def __str__(self):
        return f"{self.do_no} — {self.client_name}"


class DeliveryOrderItem(BaseModel):
    """Line item on a delivery order."""
    delivery_order = models.ForeignKey(DeliveryOrder, on_delete=models.CASCADE, related_name='items')
    description = models.TextField()
    unit = models.CharField(max_length=20, blank=True, null=True)
    qty = models.DecimalField(max_digits=10, decimal_places=2)
    remarks = models.CharField(max_length=255, blank=True, null=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order']

    def __str__(self):
        return f"{self.delivery_order.do_no} — {self.description[:50]}"


class Payment(BaseModel):
    """Individual payment against an invoice, enabling partial payment history."""
    PAYMENT_METHODS = [
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('cash', 'Cash'),
        ('paynow', 'PayNow'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    reference = models.CharField(max_length=100, blank=True, null=True, help_text='Cheque no / transaction ref')
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_payments'
    )

    def __str__(self):
        return f"{self.invoice.invoice_no} — ${self.amount} on {self.payment_date}"
