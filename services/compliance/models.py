from django.db import models
from shared.models import BaseModel


class Licence(BaseModel):
    """Company or individual licence record with expiry tracking."""
    TYPE_CHOICES = [
        ('company', 'Company'),
        ('individual', 'Individual'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('pending_renewal', 'Pending Renewal'),
    ]

    name = models.CharField(max_length=255, help_text='e.g. BCA CRS ME11')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='company')
    holder = models.ForeignKey(
        'hr.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='licences', help_text='Linked employee for individual licences'
    )
    licence_no = models.CharField(max_length=100, blank=True, null=True)
    issuer = models.CharField(max_length=100, blank=True, null=True, help_text='BCA, SPF, MOM, etc.')
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    document = models.CharField(max_length=500, blank=True, null=True, help_text='File path')
    alert_days = models.IntegerField(default=30)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    def __str__(self):
        return f"{self.name} ({self.licence_no or 'no ref'})"


class Incident(BaseModel):
    """Workplace incident report."""
    TYPE_CHOICES = [
        ('injury', 'Injury'),
        ('near_miss', 'Near Miss'),
        ('property_damage', 'Property Damage'),
        ('other', 'Other'),
    ]
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('investigating', 'Investigating'),
        ('closed', 'Closed'),
    ]

    ref_no = models.CharField(max_length=20)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='other')
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='low')
    site = models.ForeignKey(
        'organisation.Site', on_delete=models.SET_NULL, null=True, blank=True, related_name='incidents'
    )
    date = models.DateField()
    description = models.TextField()
    involved = models.JSONField(default=list, blank=True, help_text='List of Employee UUIDs')
    reported_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reported_incidents'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    corrective_action = models.TextField(blank=True, null=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.ref_no} — {self.type} ({self.severity})"
