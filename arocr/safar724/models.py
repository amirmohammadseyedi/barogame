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


class Taavoni(models.Model):
    persian_name = models.CharField(max_length=255, unique=True)
    companyNameId = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'taavoni'
        verbose_name = 'تعاونی'
        verbose_name_plural = 'تعاونی‌ها'

    def __str__(self):
        return self.persian_name


class Carts(models.Model):
    crawl_data_travel = models.ForeignKey(
        CrawlDataTravel,
        on_delete=models.CASCADE,
        related_name='carts_items',
    )
    taavoni = models.ForeignKey(
        Taavoni,
        on_delete=models.PROTECT,
        related_name='carts',
        null=True,
        blank=True,
    )
    cart_id = models.IntegerField()
    companyPersianName = models.CharField(max_length=255)
    companyNameId = models.IntegerField(null=True, blank=True)
    capacity = models.IntegerField(default=25)
    availableSeatCount = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'carts'
        verbose_name = 'کارتز'
        verbose_name_plural = 'کارتزها'

    def save(self, *args, **kwargs):
        if self.taavoni_id is None and (self.companyPersianName or '').strip():
            persian_name = self.companyPersianName.strip()
            taavoni, _created = Taavoni.objects.get_or_create(
                persian_name=persian_name,
                defaults={'companyNameId': self.companyNameId},
            )
            if self.companyNameId is not None and taavoni.companyNameId is None:
                taavoni.companyNameId = self.companyNameId
                taavoni.save(update_fields=['companyNameId'])
            self.taavoni = taavoni
        super().save(*args, **kwargs)

    def __str__(self):
        return self.companyPersianName


class ChartAxisType(models.Model):
    code = models.CharField(max_length=1, unique=True)
    label = models.CharField(max_length=50)

    class Meta:
        db_table = 'chart_axis_type'
        verbose_name = 'Chart Axis Type'
        verbose_name_plural = 'Chart Axis Types'
        ordering = ['code']

    def __str__(self):
        return self.label or self.code


class ChartParameter(models.Model):
    english_name = models.CharField(max_length=100)
    persian_name = models.CharField(max_length=100)
    axis_types = models.ManyToManyField(
        ChartAxisType,
        related_name='chart_parameters',
        blank=True,
    )

    class Meta:
        db_table = 'chart_parameter'
        verbose_name = 'Chart Parameter'
        verbose_name_plural = 'Chart Parameters'
        ordering = ['english_name']

    def __str__(self):
        return self.english_name

    @property
    def axis_codes(self):
        return list(self.axis_types.values_list('code', flat=True))
