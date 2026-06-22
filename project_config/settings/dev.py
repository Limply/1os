from .base import *
from decouple import config

SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-in-production')
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '192.168.1.27', '192.168.1.71', '192.168.1.72', '1os-dev.astronic.com.sg', 'ast1-dev.sim-eng.com']

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',  # enabled in dev
    ],
}

CSRF_TRUSTED_ORIGINS = ['https://1os-dev.astronic.com.sg', 'https://ast1-dev.sim-eng.com']
