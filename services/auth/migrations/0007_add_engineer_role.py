from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_user_preferences'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('superadmin', 'Super Admin'),
                    ('admin', 'Admin'),
                    ('manager', 'Manager'),
                    ('engineer', 'Engineer'),
                    ('staff', 'Staff'),
                    ('viewer', 'Viewer'),
                ],
                default='staff',
                max_length=20,
            ),
        ),
    ]
