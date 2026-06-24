"""Remove PermissionGroup model and User.permission_group FK.
Permissions are now managed exclusively via Position.permissions."""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_simplify_user_roles'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='permission_group',
        ),
        migrations.DeleteModel(
            name='PermissionGroup',
        ),
    ]
