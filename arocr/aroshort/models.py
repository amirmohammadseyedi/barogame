import secrets
import string

from django.core.validators import RegexValidator
from django.db import models


def generate_short_code(length=5):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class Link(models.Model):
    source_url = models.URLField(max_length=2048, verbose_name='لینک مبدا')
    short_code = models.CharField(
        max_length=5,
        unique=True,
        verbose_name='کد کوتاه',
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z0-9]{5}$',
                message='کد کوتاه باید دقیقاً ۵ کاراکتر انگلیسی یا عدد باشد.',
            ),
        ],
    )
    visit_count = models.PositiveIntegerField(default=0, verbose_name='تعداد بازدید')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'links'
        verbose_name = 'لینک'
        verbose_name_plural = 'لینک‌ها'
        ordering = ['-created_at']

    def __str__(self):
        return self.short_code

    def get_short_path(self):
        from django.urls import reverse

        return reverse('aroshort-redirect', kwargs={'short_code': self.short_code})

    def get_short_url(self):
        from django.conf import settings

        return f'{settings.BACKEND_BASE_DOMAIN}{self.get_short_path()}'

    def save(self, *args, **kwargs):
        if not self.short_code:
            while True:
                code = generate_short_code()
                if not Link.objects.filter(short_code=code).exists():
                    self.short_code = code
                    break
        super().save(*args, **kwargs)
