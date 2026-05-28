from django.db import models
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
