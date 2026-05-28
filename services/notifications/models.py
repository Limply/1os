from django.db import models
from shared.models import BaseModel


class Notification(BaseModel):
    """Outbound notification to a user via one of the supported channels."""
    CHANNEL_CHOICES = [
        ('in_app', 'In App'),
        ('email', 'Email'),
        ('telegram', 'Telegram'),
        ('sms', 'SMS'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    recipient = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='notifications'
    )
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='in_app')
    subject = models.CharField(max_length=255, blank=True, null=True)
    message = models.TextField()
    trigger = models.CharField(max_length=100, blank=True, null=True, help_text='e.g. job_assigned')
    ref_type = models.CharField(max_length=50, blank=True, null=True, help_text='Job, Leave, Licence, etc.')
    ref_id = models.UUIDField(null=True, blank=True, help_text='ID of the related object')
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recipient} — {self.trigger or self.subject or 'notification'}"
