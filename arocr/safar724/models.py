from django.db import models


def empty_json():
    return {}


class Travel(models.Model):
    origin_code = models.CharField(max_length=50)
    destination_code = models.CharField(max_length=50)

    class Meta:
        db_table = 'travel'
        verbose_name = 'Travel'
        verbose_name_plural = 'Travels'

    def __str__(self):
        return f'{self.origin_code} -> {self.destination_code}'


class CrawlDataTravel(models.Model):
    travel = models.ForeignKey(
        Travel,
        on_delete=models.CASCADE,
        related_name='crawl_data',
    )
    date = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)
    data = models.JSONField(default=empty_json, blank=True)

    class Meta:
        db_table = 'crawl_data_travel'
        verbose_name = 'Crawl Data Travel'
        verbose_name_plural = 'Crawl Data Travels'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.travel} ({self.date}) @ {self.created_at:%Y-%m-%d %H:%M}'
