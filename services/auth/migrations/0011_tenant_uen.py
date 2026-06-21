from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_tenant_signatory'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='uen',
            field=models.CharField(blank=True, help_text='Unique Entity Number (UEN) — mandatory for all SG registered entities', max_length=50, null=True),
        ),
    ]
