import os

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Print env-backed Django host/CORS settings for debugging'

    def handle(self, *args, **options):
        env_vars = (
            'BACKEND_BASE_DOMAIN',
            'ALLOWED_HOSTS',
            'CSRF_TRUSTED_ORIGINS',
            'CORS_ALLOWED_ORIGINS',
            'DEBUG',
        )

        self.stdout.write('=== Raw environment ===')
        for name in env_vars:
            value = os.environ.get(name)
            if value is None:
                self.stdout.write(f'{name}: <not set>')
            else:
                self.stdout.write(f'{name}: {value}')

        self.stdout.write('')
        self.stdout.write('=== Django settings ===')
        self.stdout.write(f'BACKEND_BASE_DOMAIN: {settings.BACKEND_BASE_DOMAIN}')
        self.stdout.write(f'DEBUG: {settings.DEBUG}')
        self.stdout.write('ALLOWED_HOSTS:')
        for host in settings.ALLOWED_HOSTS:
            self.stdout.write(f'  - {host}')
        self.stdout.write('CSRF_TRUSTED_ORIGINS:')
        for origin in settings.CSRF_TRUSTED_ORIGINS:
            self.stdout.write(f'  - {origin}')
        self.stdout.write('CORS_ALLOWED_ORIGINS:')
        for origin in settings.CORS_ALLOWED_ORIGINS:
            self.stdout.write(f'  - {origin}')
