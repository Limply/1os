from django.db import models
from shared.models import BaseModel


class Contact(BaseModel):
    client     = models.ForeignKey('organisation.Client', on_delete=models.CASCADE, related_name='contacts')
    name       = models.CharField(max_length=255)
    position   = models.CharField(max_length=255, blank=True, null=True)
    phone      = models.CharField(max_length=20, blank=True, null=True)
    email      = models.EmailField(blank=True, null=True)
    whatsapp   = models.CharField(max_length=20, blank=True, null=True)
    is_primary = models.BooleanField(default=False)
    notes      = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-is_primary', 'name']

    def __str__(self):
        return f'{self.name} ({self.client.name})'


class Lead(BaseModel):
    STATUS_CHOICES = [
        ('new',       'New'),
        ('contacted', 'Contacted'),
        ('quoted',    'Quoted'),
        ('won',       'Won'),
        ('lost',      'Lost'),
    ]
    SOURCE_CHOICES = [
        ('referral',  'Referral'),
        ('repeat',    'Repeat Client'),
        ('cold_call', 'Cold Call'),
        ('walk_in',   'Walk In'),
        ('tender',    'Tender'),
        ('other',     'Other'),
    ]
    client          = models.ForeignKey('organisation.Client', on_delete=models.CASCADE, related_name='leads')
    title           = models.CharField(max_length=255)
    description     = models.TextField(blank=True, null=True)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    source          = models.CharField(max_length=20, choices=SOURCE_CHOICES, blank=True, null=True)
    estimated_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    assigned_to     = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_leads'
    )
    next_follow_up  = models.DateField(null=True, blank=True)
    lost_reason     = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.client.name})'


class Interaction(BaseModel):
    TYPE_CHOICES = [
        ('call',       'Phone Call'),
        ('email',      'Email'),
        ('site_visit', 'Site Visit'),
        ('meeting',    'Meeting'),
        ('quote_sent', 'Quote Sent'),
        ('other',      'Other'),
    ]
    lead   = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='interactions')
    type   = models.CharField(max_length=20, choices=TYPE_CHOICES)
    notes  = models.TextField(blank=True, default='')
    date   = models.DateField()
    by     = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='crm_interactions'
    )

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.get_type_display()} on {self.date} — {self.lead.title}'
