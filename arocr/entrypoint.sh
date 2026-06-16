#!/bin/sh
set -e

python manage.py migrate --noinput

# Celery worker (background)
celery -A arocr worker --loglevel=info &

# Celery beat scheduler (background) - triggers crawl every 30 minutes
celery -A arocr beat --loglevel=info &

# Django (foreground - keeps the container alive)
exec gunicorn arocr.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
