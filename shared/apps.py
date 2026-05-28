from django.apps import AppConfig


class SharedConfig(AppConfig):
    default_auto_field = 'django.db.models.UUIDField'
    name = 'shared'
    label = 'shared'
