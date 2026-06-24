"""Standardise position title: 'Foremen' → 'Foreman'."""
from django.db import migrations


def rename_foremen(apps, schema_editor):
    Position = apps.get_model('organisation', 'Position')
    Position.objects.filter(title='Foremen').update(title='Foreman')


class Migration(migrations.Migration):

    dependencies = [
        ('organisation', '0007_fix_foremen_permissions'),
    ]

    operations = [
        migrations.RunPython(rename_foremen, migrations.RunPython.noop),
    ]
