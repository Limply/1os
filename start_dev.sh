#!/bin/bash
# Run both Django dev server and Vite dev server
cd /home/lucus/1os-dev
source venv/bin/activate

export DJANGO_SETTINGS_MODULE=project_config.settings.dev

echo "Starting Django dev server on :8001..."
python manage.py runserver 0.0.0.0:8001 --noreload &
DJANGO_PID=$!

echo "Starting Vite dev server on :5173..."
cd frontend && npm run dev &
VITE_PID=$!

trap "kill $DJANGO_PID $VITE_PID" EXIT
wait
