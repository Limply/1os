"""Seed permissions onto existing Position records based on title keywords."""
from django.db import migrations

# Inline permission strings — no shared import in migrations
SUPERVISOR_PERMS = ['dashboard.view', 'supervisor.app', 'projects.view', 'hr.view', 'files.view']
FOREMAN_PERMS    = ['supervisor.app', 'projects.view', 'hr.view']
MANAGER_PERMS    = [
    'dashboard.view', 'projects.view', 'projects.edit', 'projects.delete',
    'hr.view', 'hr.manage', 'hr.approve_leave',
    'operations.view', 'operations.edit',
    'finance.view', 'crm.view', 'crm.edit',
    'compliance.view', 'files.view', 'settings.view',
]
STAFF_PERMS = ['dashboard.view', 'hr.view']

KEYWORD_MAP = [
    ('manager',    MANAGER_PERMS),
    ('supervisor', SUPERVISOR_PERMS),
    ('forem',      FOREMAN_PERMS),   # matches 'Foreman' and 'Foremen'
]


def seed_permissions(apps, schema_editor):
    Position = apps.get_model('organisation', 'Position')
    for pos in Position.objects.all():
        title = pos.title.lower()
        matched = next((perms for kw, perms in KEYWORD_MAP if kw in title), STAFF_PERMS)
        pos.permissions = matched
        pos.save(update_fields=['permissions'])


class Migration(migrations.Migration):

    dependencies = [
        ('organisation', '0005_position_permissions'),
    ]

    operations = [
        migrations.RunPython(seed_permissions, migrations.RunPython.noop),
    ]
