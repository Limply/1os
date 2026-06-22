from django.db import models, transaction
from django.utils import timezone
from shared.models import BaseModel


class Job(BaseModel):
    """Field job card: installation, maintenance, repair, inspection, or WTS."""
    TYPE_CHOICES = [
        ('installation', 'Installation'),
        ('maintenance', 'Maintenance'),
        ('repair', 'Repair'),
        ('inspection', 'Inspection'),
        ('wts', 'Weight Test Scheduling'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    job_no = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='maintenance')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    site = models.ForeignKey(
        'organisation.Site', on_delete=models.SET_NULL, null=True, blank=True, related_name='jobs'
    )
    client_name = models.CharField(max_length=255, blank=True, null=True)
    client_contact = models.CharField(max_length=20, blank=True, null=True)
    assigned_to = models.JSONField(default=list, blank=True, help_text='List of User UUIDs')
    scheduled_date = models.DateField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    instructions = models.TextField(blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.job_no} — {self.title}"


class WTSRequest(BaseModel):
    """Weight Test Scheduling request — Astronic-specific."""
    DELIVERY_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('returned', 'Returned'),
    ]
    RESULT_CHOICES = [
        ('pass', 'Pass'),
        ('fail', 'Fail'),
        ('pending', 'Pending'),
    ]

    job = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True, blank=True, related_name='wts_requests')
    ref_no = models.CharField(max_length=20, unique=True)
    site = models.ForeignKey(
        'organisation.Site', on_delete=models.CASCADE, related_name='wts_requests'
    )
    lift_no = models.CharField(max_length=50, blank=True, null=True)
    test_date = models.DateField()
    test_time = models.TimeField(null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    delivery_status = models.CharField(
        max_length=20, choices=DELIVERY_STATUS_CHOICES, default='pending'
    )
    driver = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='wts_deliveries'
    )
    current_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    current_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    signoff_by = models.CharField(max_length=100, blank=True, null=True)
    signoff_at = models.DateTimeField(null=True, blank=True)
    result = models.CharField(max_length=10, choices=RESULT_CHOICES, default='pending')

    def __str__(self):
        return f"{self.ref_no} — {self.site}"


class Asset(BaseModel):
    """Company asset: equipment, tool, vehicle, or IT item."""
    TYPE_CHOICES = [
        ('equipment', 'Equipment'),
        ('tool', 'Tool'),
        ('vehicle', 'Vehicle'),
        ('it', 'IT'),
    ]
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('in_use', 'In Use'),
        ('maintenance', 'Under Maintenance'),
        ('retired', 'Retired'),
    ]

    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='equipment')
    serial_no = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    assigned_to = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_assets'
    )
    location = models.ForeignKey(
        'organisation.Site', on_delete=models.SET_NULL, null=True, blank=True, related_name='assets'
    )
    purchase_date = models.DateField(null=True, blank=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    next_service = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.serial_no or 'no S/N'})"


class Inspection(BaseModel):
    """Site inspection record with checklist and photos."""
    RESULT_CHOICES = [
        ('pass', 'Pass'),
        ('fail', 'Fail'),
        ('conditional', 'Conditional'),
    ]

    job = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True, blank=True, related_name='inspections')
    site = models.ForeignKey(
        'organisation.Site', on_delete=models.CASCADE, related_name='inspections'
    )
    type = models.CharField(max_length=100, help_text='e.g. Lift Annual Inspection')
    inspector = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='inspections'
    )
    date = models.DateField()
    result = models.CharField(max_length=20, choices=RESULT_CHOICES, blank=True, null=True)
    checklist = models.JSONField(default=dict, blank=True)
    photos = models.JSONField(default=list, blank=True, help_text='List of file paths')
    remarks = models.TextField(blank=True, null=True)
    next_due = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.type} @ {self.site} ({self.date})"


def _generate_service_number():
    year = timezone.now().strftime("%y")
    prefix = f"SE-{year}-"
    with transaction.atomic():
        last = (
            ServiceJob.objects
            .select_for_update()
            .filter(service_number__startswith=prefix)
            .order_by('-created_at')
            .first()
        )
        next_num = (int(last.service_number.split('-')[-1]) + 1) if last else 1
        return f"{prefix}{next_num:03d}"


class ServiceJob(BaseModel):
    STATUS_CHOICES = [
        ('draft',        'Draft'),
        ('sent',         'Sent'),
        ('acknowledged', 'Acknowledged'),
        ('closed',       'Closed'),
    ]

    service_number = models.CharField(max_length=20, unique=True, editable=False)
    client         = models.ForeignKey(
        'organisation.Client', on_delete=models.PROTECT, related_name='service_jobs'
    )
    site           = models.ForeignKey(
        'organisation.Site', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='service_jobs'
    )
    site_name      = models.CharField(max_length=255)
    site_address   = models.TextField()
    invoice_date   = models.DateField()
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    remarks        = models.TextField(blank=True, default='')
    created_by     = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='service_jobs'
    )
    acknowledged_by   = models.CharField(max_length=255, blank=True, null=True)
    acknowledged_at   = models.DateField(null=True, blank=True)
    generated_doc_url = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.service_number:
            self.service_number = _generate_service_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.service_number} — {self.client}"

    @property
    def total_amount(self):
        return sum(item.amount for item in self.line_items.all())


class ServiceReportItem(BaseModel):
    job         = models.ForeignKey(ServiceJob, on_delete=models.CASCADE, related_name='report_items')
    item_number = models.PositiveSmallIntegerField()
    title       = models.CharField(max_length=150)
    issue_points          = models.JSONField(default=list)
    action_points         = models.JSONField(default=list)
    recommendation_points = models.JSONField(default=list)

    class Meta:
        ordering = ['item_number']
        unique_together = [('job', 'item_number')]

    def __str__(self):
        return f"{self.job.service_number} – Item {self.item_number}: {self.title}"


class ServiceReportPhoto(BaseModel):
    """Photo attached to a report item, shown after its recommendation."""
    item       = models.ForeignKey(
        ServiceReportItem, on_delete=models.CASCADE, related_name='photos'
    )
    image      = models.ImageField(upload_to='service_reports/photos/')
    caption    = models.CharField(max_length=255, blank=True, default='')
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'created_at']

    def __str__(self):
        return f"{self.item} – photo {self.pk}"


class InvoiceLineItem(BaseModel):
    UNIT_CHOICES = [
        ('lot', 'lot'),
        ('run', 'run'),
        ('pcs', 'pcs'),
        ('hrs', 'hrs'),
        ('set', 'set'),
        ('m',   'm'),
    ]

    job         = models.ForeignKey(ServiceJob, on_delete=models.CASCADE, related_name='line_items')
    line_number = models.PositiveSmallIntegerField()
    description = models.TextField()
    quantity    = models.DecimalField(max_digits=8, decimal_places=2)
    unit        = models.CharField(max_length=10, choices=UNIT_CHOICES, default='lot')
    amount      = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['line_number']
        unique_together = [('job', 'line_number')]

    def __str__(self):
        return f"{self.job.service_number} – Line {self.line_number}: {self.description[:50]}"
