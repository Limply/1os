from django.apps import AppConfig


class OrganisationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.organisation'
    label = 'organisation'

    def ready(self):
        from . import signals  # noqa: F401
