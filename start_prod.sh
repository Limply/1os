#!/bin/bash
set -e
cd /opt/1os
source venv/bin/activate

export DJANGO_SETTINGS_MODULE=project_config.settings.prod

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
exec gunicorn project_config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3 \
  --timeout 120 \
  --access-logfile /tmp/gunicorn-access.log \
  --error-logfile /tmp/gunicorn-error.log \
  --log-level info
