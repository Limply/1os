from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0009_manpower_settings'),
    ]

    operations = [
        migrations.RenameField(
            model_name='manpowersettings',
            old_name='show_staff',
            new_name='show_workers',
        ),
    ]
