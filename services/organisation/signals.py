"""NAS folder hooks for organisation models.

On Client creation, assign a stable, human-readable `nas_folder`
(YYYY-MM_Customer-Name) and create it on the NAS. Folder creation is best-effort:
a filesystem failure must never block the DB write (the DB is the source of truth).
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from shared import nas
from .models import Client

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Client)
def client_folder(sender, instance: Client, created, **kwargs):
    if not created:
        return
    try:
        folder_name = instance.nas_folder.strip() if instance.nas_folder else ''
        if not folder_name:
            folder_name = nas.month_folder(instance.name, instance.created_at)
            # Persist without re-triggering this signal.
            Client.objects.filter(pk=instance.pk).update(nas_folder=folder_name)
        nas.ensure_folder(folder_name)
    except Exception:
        logger.exception('NAS: failed to create folder for Client %s', instance.pk)
