from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organisation', '0004_add_client_type_address_website'),
    ]

    operations = [
        migrations.AddField(
            model_name='position',
            name='permissions',
            field=models.JSONField(blank=True, default=list, help_text='Permission strings granted to holders of this position'),
        ),
    ]
