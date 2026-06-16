from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_add_engineer_role'),
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
                    ('foreman', 'Foreman'),
                    ('staff', 'Staff'),
                    ('viewer', 'Viewer'),
                ],
                default='staff',
                max_length=20,
            ),
        ),
    ]
