import datetime
from django.db import models
from shared.models import BaseModel


def _next_no(model, field, prefix):
    year = str(datetime.date.today().year)[2:]
    p = f'{prefix}-{year}-'
    last = model.objects.filter(**{f'{field}__startswith': p}).order_by(f'-{field}').first()
    seq = int(getattr(last, field).split('-')[-1]) + 1 if last else 1
    return f'{p}{seq:03d}'


class Quotation(BaseModel):
    """Customer quotation / bill of quantities."""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]

    quote_no   = models.CharField(max_length=20, unique=True, blank=True)
    project_no = models.CharField(max_length=20, blank=True, null=True, help_text='Linked project number e.g. AST-26-0001')
    client_name    = models.CharField(max_length=255)
    client_contact = models.CharField(max_length=255, blank=True, null=True)
    client_email   = models.EmailField(blank=True, null=True)
    client_phone   = models.CharField(max_length=20, blank=True, null=True)
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

    def save(self, *args, **kwargs):
        if not self.quote_no:
            self.quote_no = _next_no(Quotation, 'quote_no', 'Q')
        super().save(*args, **kwargs)

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

    invoice_no = models.CharField(max_length=20, unique=True, blank=True)
    project_no = models.CharField(max_length=20, blank=True, null=True, help_text='Linked project number')
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

    def save(self, *args, **kwargs):
        if not self.invoice_no:
            self.invoice_no = _next_no(Invoice, 'invoice_no', 'INV')
        super().save(*args, **kwargs)

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

    do_no = models.CharField(max_length=20, unique=True, blank=True)
    project_no = models.CharField(max_length=20, blank=True, null=True, help_text='Linked project number')
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

    def save(self, *args, **kwargs):
        if not self.do_no:
            self.do_no = _next_no(DeliveryOrder, 'do_no', 'DO')
        super().save(*args, **kwargs)

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


class Expense(BaseModel):
    """Project expense recorded against the Finance database."""
    CATEGORIES = [
        ('labour',      'Labour'),
        ('material',    'Material'),
        ('equipment',   'Equipment'),
        ('transport',   'Transport'),
        ('subcontract', 'Subcontract'),
        ('misc',        'Miscellaneous'),
    ]

    project_no   = models.CharField(max_length=20, blank=True, null=True, help_text='Linked project number')
    description  = models.CharField(max_length=255)
    category     = models.CharField(max_length=20, choices=CATEGORIES, default='misc')
    amount       = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField()
    reference    = models.CharField(max_length=100, blank=True, null=True)
    notes        = models.TextField(blank=True, null=True)
    recorded_by  = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recorded_expenses'
    )

    class Meta:
        ordering = ['-expense_date']

    def __str__(self):
        return f"{self.project_no or '—'} — {self.description} ${self.amount}"


class Payment(BaseModel):
    """Individual payment against an invoice, enabling partial payment history."""
    PAYMENT_METHODS = [
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('cash', 'Cash'),
        ('paynow', 'PayNow'),
    ]

    quotation = models.ForeignKey(
        Quotation, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments',
        help_text='Set if payment is against a quotation (e.g. deposit) without an invoice'
    )
    invoice = models.ForeignKey(
        Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments',
        help_text='Set if payment is against a specific invoice'
    )
    project_no = models.CharField(max_length=20, blank=True, null=True, help_text='Linked project number')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    reference = models.CharField(max_length=100, blank=True, null=True, help_text='Cheque no / transaction ref')
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_payments'
    )

    def __str__(self):
        ref = self.invoice.invoice_no if self.invoice else (self.quotation.quote_no if self.quotation else self.project_no or '—')
        return f"{ref} — ${self.amount} on {self.payment_date}"
