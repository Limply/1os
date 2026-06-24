from pathlib import Path
from datetime import timedelta
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
]

LOCAL_APPS = [
    'shared',
    'services.auth',
    'services.organisation',
    'services.hr',
    'services.operations',
    'services.finance',
    'services.compliance',
    'services.notifications',
    'services.dashboard',
    'services.projects',
    'services.crm',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'shared.middleware.DynamicCORSMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'shared.middleware.TenantMiddleware',
]

ROOT_URLCONF = 'project_config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'frontend' / 'dist'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'project_config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='1os_db_dev'),
        'USER': config('DB_USER', default='astronic_user'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Singapore'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = '/mnt/data/1os/media'

FRONTEND_DIR = BASE_DIR / 'frontend' / 'dist'

DEFAULT_FILE_STORAGE = 'shared.storage.FileBrowserStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Email — configure SMTP_* vars in .env to enable sending
_smtp_host = config('SMTP_HOST', default='')
EMAIL_BACKEND = (
    'django.core.mail.backends.smtp.EmailBackend'
    if _smtp_host else
    'django.core.mail.backends.console.EmailBackend'
)
EMAIL_HOST          = _smtp_host
EMAIL_PORT          = config('SMTP_PORT', default=587, cast=int)
EMAIL_HOST_USER     = config('SMTP_USER', default='')
EMAIL_HOST_PASSWORD = config('SMTP_PASSWORD', default='')
EMAIL_USE_TLS       = True
DEFAULT_FROM_EMAIL  = config('SMTP_USER', default='noreply@astronic.com.sg')

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'UPDATE_LAST_LOGIN': True,
}

