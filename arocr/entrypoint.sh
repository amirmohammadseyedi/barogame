#!/bin/sh
set -e

python manage.py migrate --noinput

# Celery worker (background)
celery -A arocr worker --loglevel=info &

# Celery beat scheduler (background) - triggers crawl every 30 minutes
celery -A arocr beat --loglevel=info &

# Django development server (foreground - keeps the container alive)
python manage.py runserver 0.0.0.0:8000
