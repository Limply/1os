"""Keep Quotation stored totals (subtotal / gst_amount / total) in sync with its
line items, so edits made via Django admin or the API stay consistent — not just
the frontend create flow which pre-computes them."""
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Sum
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

GST_RATE = Decimal('0.09')


def recalc_quotation_totals(quotation):
    if quotation is None or not quotation.pk:
        return

    from .models import Quotation
    if not Quotation.objects.filter(pk=quotation.pk).exists():
        return  # parent is being cascade-deleted

    subtotal = quotation.items.aggregate(t=Sum('amount'))['t'] or Decimal('0')

    # Preserve THIS quotation's existing GST treatment rather than imposing the
    # current tenant flag — so editing a historical quote never silently adds or
    # strips GST. A quote "has GST" if it currently carries any, i.e. total > subtotal.
    has_gst = (quotation.gst_amount or Decimal('0')) > 0 or \
        (quotation.total or Decimal('0')) > (quotation.subtotal or Decimal('0'))
    gst = subtotal * GST_RATE if has_gst else Decimal('0')
    gst = gst.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    total = subtotal + gst

    if quotation.subtotal == subtotal and quotation.gst_amount == gst and quotation.total == total:
        return  # nothing changed — avoid a needless write

    quotation.subtotal = subtotal
    quotation.gst_amount = gst
    quotation.total = total
    quotation.save(update_fields=['subtotal', 'gst_amount', 'total', 'updated_at'])


@receiver(post_save, sender='finance.QuotationItem')
def _quotation_item_saved(sender, instance, **kwargs):
    recalc_quotation_totals(instance.quotation)


@receiver(post_delete, sender='finance.QuotationItem')
def _quotation_item_deleted(sender, instance, **kwargs):
    try:
        quotation = instance.quotation
    except Exception:
        return
    recalc_quotation_totals(quotation)
