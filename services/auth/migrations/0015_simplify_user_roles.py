"""Collapse manager/supervisor/foreman/viewer roles into admin or staff.
manager → admin (they need full management access)
supervisor/foreman/viewer → staff (permissions now come from Position)
Then narrow the role field choices to superadmin/admin/staff only.
"""
from django.db import migrations, models


def collapse_roles(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(role='manager').update(role='admin')
    User.objects.filter(role__in=['supervisor', 'foreman', 'viewer']).update(role='staff')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0014_user_roles_and_permission_group'),
    ]

    operations = [
        migrations.RunPython(collapse_roles, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('superadmin', 'Super Admin'),
                    ('admin', 'Admin'),
                    ('staff', 'Staff'),
                ],
                default='staff',
                max_length=20,
            ),
        ),
    ]
