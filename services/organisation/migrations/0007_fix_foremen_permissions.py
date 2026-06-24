"""Fix permissions for positions whose title contains 'forem' (Foremen, Foreman, etc).
The seed in 0006 used keyword 'foreman' which doesn't match 'Foremen'."""
from django.db import migrations

FOREMAN_PERMS = ['supervisor.app', 'projects.view', 'hr.view']


def fix_foremen(apps, schema_editor):
    Position = apps.get_model('organisation', 'Position')
    for pos in Position.objects.all():
        if 'forem' in pos.title.lower():
            pos.permissions = FOREMAN_PERMS
            pos.save(update_fields=['permissions'])


class Migration(migrations.Migration):

    dependencies = [
        ('organisation', '0006_seed_position_permissions'),
    ]

    operations = [
        migrations.RunPython(fix_foremen, migrations.RunPython.noop),
    ]
