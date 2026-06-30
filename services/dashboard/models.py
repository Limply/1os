from django.db import models
from shared.models import BaseModel


class CompanyStrategy(BaseModel):
    """The company's business strategy — the 5 core elements.

    Singleton: one row per 1OS install (single-tenant per server). Each field
    holds the free-text statement for that element.
    """
    direction  = models.TextField(blank=True, default='')
    objectives = models.TextField(blank=True, default='')
    strategy   = models.TextField(blank=True, default='')
    tactics    = models.TextField(blank=True, default='')
    monitoring = models.TextField(blank=True, default='')

    class Meta:
        verbose_name_plural = 'company strategies'

    def __str__(self):
        return 'Company Strategy'
