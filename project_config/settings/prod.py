from .base import *
from decouple import config

SECRET_KEY = config('SECRET_KEY')  # required — no default, will crash if missing
DEBUG = False

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='ast1.sim-eng.com').split(',')

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
        'rest_framework.renderers.JSONRenderer',  # no browsable API in prod
    ],
}

CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='').split(',') if config('CSRF_TRUSTED_ORIGINS', default='') else []

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SESSION_COOKIE_SECURE = True    # only send session cookie over HTTPS
CSRF_COOKIE_SECURE = True       # only send CSRF cookie over HTTPS
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # trust Cloudflare's HTTPS header
