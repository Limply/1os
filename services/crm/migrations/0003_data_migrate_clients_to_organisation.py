from django.db import migrations


def copy_crm_clients_to_organisation(apps, schema_editor):
    CrmClient = apps.get_model('crm', 'Client')
    OrgClient = apps.get_model('organisation', 'Client')

    for crm_client in CrmClient.objects.all():
        OrgClient.objects.get_or_create(
            id=crm_client.id,
            defaults={
                'name':    crm_client.name,
                'type':    crm_client.type,
                'address': crm_client.address,
                'website': crm_client.website,
                'notes':   crm_client.notes,
            }
        )


def reverse_copy(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0002_remove_client_tenant_remove_contact_tenant_and_more'),
        ('organisation', '0004_add_client_type_address_website'),
    ]

    operations = [
        migrations.RunPython(copy_crm_clients_to_organisation, reverse_copy),
    ]
