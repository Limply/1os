import datetime
from django.db import migrations, models


def assign_project_numbers(apps, schema_editor):
    Project = apps.get_model('projects', 'Project')
    year = str(datetime.date.today().year)[2:]
    for i, project in enumerate(Project.objects.all().order_by('created_at'), 1):
        project.project_no = f'AST-{year}-{i:03d}'
        project.save(update_fields=['project_no'])


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0005_remove_project_photo_task_photo'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='client_address',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='project',
            name='client_contact',
            field=models.CharField(blank=True, help_text='Contact person name', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='project',
            name='client_email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='project',
            name='client_phone',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        # Add project_no as nullable first
        migrations.AddField(
            model_name='project',
            name='project_no',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        # Assign numbers to existing projects
        migrations.RunPython(assign_project_numbers, migrations.RunPython.noop),
        # Now make it unique and non-nullable
        migrations.AlterField(
            model_name='project',
            name='project_no',
            field=models.CharField(blank=True, max_length=20, unique=True),
        ),
    ]
