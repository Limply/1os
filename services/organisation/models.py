from django.db import models
from shared.models import BaseModel


class Company(BaseModel):
    """Primary company profile for the tenant."""
    name = models.CharField(max_length=255)
    uen = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    postal_code = models.CharField(max_length=10, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    logo = models.CharField(max_length=500, blank=True, null=True)
    gst_registered = models.BooleanField(default=False)
    gst_number = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        verbose_name_plural = 'companies'

    def __str__(self):
        return self.name


class Department(BaseModel):
    """Organisational department, supports nesting."""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True, null=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children'
    )
    head = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='headed_departments'
    )

    def __str__(self):
        return self.name


class Team(BaseModel):
    """Team within a department."""
    name = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='teams')
    lead = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='led_teams'
    )

    def __str__(self):
        return self.name


class Position(BaseModel):
    """Job title / position definition."""
    title = models.CharField(max_length=100)
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='positions'
    )
    level = models.IntegerField(null=True, blank=True, help_text='Seniority level 1-10')

    def __str__(self):
        return self.title


class Site(BaseModel):
    """Physical location: office, branch, client site, or warehouse."""
    TYPE_CHOICES = [
        ('office', 'Office'),
        ('branch', 'Branch'),
        ('client_site', 'Client Site'),
        ('warehouse', 'Warehouse'),
    ]
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='office')
    address = models.TextField(blank=True, null=True)
    postal_code = models.CharField(max_length=10, blank=True, null=True)
    lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    contact_name = models.CharField(max_length=100, blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Client(BaseModel):
    """Client / customer company record."""
    name = models.CharField(max_length=255)
    uen = models.CharField(max_length=20, blank=True, null=True, help_text='UEN / company registration')
    gst_no = models.CharField(max_length=20, blank=True, null=True)
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    billing_address = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
