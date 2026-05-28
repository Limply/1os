from django.db import migrations, models
import django.db.models.deletion


def migrate_tasklist_to_task(apps, schema_editor):
    Task = apps.get_model('projects', 'Task')
    TaskList = apps.get_model('projects', 'TaskList')
    for task in Task.objects.select_related('task_list__project').all():
        if task.task_list:
            task.project = task.task_list.project
            task.group = task.task_list.name
            task.save()


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0002_alter_task_options_remove_task_project_and_more'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        # Step 1: add project (nullable) and group to Task
        migrations.AddField(
            model_name='task',
            name='project',
            field=models.ForeignKey(
                null=True, blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='tasks',
                to='projects.project',
            ),
        ),
        migrations.AddField(
            model_name='task',
            name='group',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        # Step 2: data migration
        migrations.RunPython(migrate_tasklist_to_task, migrations.RunPython.noop),
        # Step 3: make project non-nullable
        migrations.AlterField(
            model_name='task',
            name='project',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='tasks',
                to='projects.project',
            ),
        ),
        # Step 4: remove task_list FK
        migrations.RemoveField(
            model_name='task',
            name='task_list',
        ),
        # Step 5: drop TaskList table
        migrations.DeleteModel(
            name='TaskList',
        ),
        # Step 6: update Task ordering
        migrations.AlterModelOptions(
            name='task',
            options={'ordering': ['group', 'priority', 'due_date']},
        ),
    ]
