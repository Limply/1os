from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('hr', '0008_separate_photo_subfolders'),
    ]

    operations = [
        migrations.CreateModel(
            name='ManpowerSettings',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('show_directors', models.BooleanField(default=False)),
                ('show_managers', models.BooleanField(default=False)),
                ('show_senior_supervisors', models.BooleanField(default=True)),
                ('show_supervisors', models.BooleanField(default=True)),
                ('show_technicians', models.BooleanField(default=True)),
                ('show_helpers', models.BooleanField(default=True)),
                ('show_workers', models.BooleanField(default=True)),
                ('show_on_site_indicator', models.BooleanField(default=True, help_text='Show green glow for on-site staff')),
                ('show_leave_status', models.BooleanField(default=True, help_text='Show leave status on calendar')),
                ('show_unassigned', models.BooleanField(default=True, help_text='Show unassigned staff')),
                ('show_teams', models.BooleanField(default=True, help_text='Show staff grouped by supervisor')),
                ('tenant', models.OneToOneField(db_column='tenant_id', on_delete=django.db.models.deletion.CASCADE, related_name='+', to='accounts.tenant')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]

