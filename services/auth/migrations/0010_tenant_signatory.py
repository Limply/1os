from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_revert_role_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='signatory_name',
            field=models.CharField(blank=True, help_text='Name printed on quotation/invoice signature block', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='signatory_designation',
            field=models.CharField(blank=True, help_text='Designation printed on quotation/invoice signature block', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='signatory_file',
            field=models.ImageField(blank=True, help_text='Signature image embedded in generated documents', null=True, upload_to='tenant/signatory/'),
        ),
    ]
