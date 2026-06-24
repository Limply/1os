from django.db import migrations
from shared.permissions import ROLE_DEFAULT_PERMISSIONS


def seed_permission_groups(apps, schema_editor):
    Tenant = apps.get_model('accounts', 'Tenant')
    PermissionGroup = apps.get_model('accounts', 'PermissionGroup')

    for tenant in Tenant.objects.all():
        for role, perms in ROLE_DEFAULT_PERMISSIONS.items():
            name = f'Default — {role.capitalize()}'
            PermissionGroup.objects.get_or_create(
                tenant=tenant,
                name=name,
                defaults={'permissions': perms, 'is_active': True},
            )


def remove_seeded_groups(apps, schema_editor):
    PermissionGroup = apps.get_model('accounts', 'PermissionGroup')
    roles = list(ROLE_DEFAULT_PERMISSIONS.keys()) + ['superadmin']
    names = [f'Default — {r.capitalize()}' for r in roles]
    PermissionGroup.objects.filter(name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_tenant_files_url'),
    ]

    operations = [
        migrations.RunPython(seed_permission_groups, remove_seeded_groups),
    ]
