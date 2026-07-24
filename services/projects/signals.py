"""NAS folder hooks for projects.

On Project creation, create its SE-YY-NNN folder under the right customer folder:
  1. client_name matches a Client record -> that Client's nas_folder
  2. client_name present but unmatched    -> derived 'YYYY-MM_<client_name>'
  3. client_name blank                     -> '_Unfiled'
Folder creation is best-effort and must never block the DB write.
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from shared import nas
from .models import Project

logger = logging.getLogger(__name__)

UNFILED = '_Unfiled'


def resolve_client_segment(project: Project) -> str:
    """Return the customer-folder segment a project's files belong under."""
    cn = (project.client_name or '').strip()
    if not cn:
        return UNFILED

    # Exact (case-insensitive) match to a curated Client record.
    from services.organisation.models import Client
    client = Client.objects.filter(name__iexact=cn).first()
    if client:
        if client.nas_folder and client.nas_folder.strip():
            return client.nas_folder.strip()
        return nas.month_folder(client.name, client.created_at)

    # Unmatched free-text customer: derive a dated folder, dated by the project.
    when = project.start_date or project.created_at
    return nas.month_folder(cn, when)


def project_segments(project: Project):
    """The [customer, project_no] path segments for a project's folder."""
    return [resolve_client_segment(project), project.project_no]


def project_folder_path(project: Project):
    """Resolve the project's folder path WITHOUT creating it."""
    return nas.folder_path(*project_segments(project))


def ensure_project_folder(project: Project):
    """Create root/<customer>/<project_no>/ and return the path."""
    return nas.ensure_folder(*project_segments(project))


@receiver(post_save, sender=Project)
def project_folder(sender, instance: Project, created, **kwargs):
    if not created:
        return
    try:
        ensure_project_folder(instance)
    except Exception:
        logger.exception('NAS: failed to create folder for Project %s', instance.pk)
