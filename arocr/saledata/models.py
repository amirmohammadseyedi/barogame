from django.db import models


class ResamSaleData(models.Model):
    ticket_id = models.BigIntegerField(db_column='TicketId', primary_key=True)
    ticket_code = models.BigIntegerField(db_column='TicketCode', null=True, blank=True)
    service_id = models.BigIntegerField(db_column='ServiceId', null=True, blank=True)
    sub_service_id = models.BigIntegerField(db_column='SubServiceId', null=True, blank=True)
    origin_station = models.TextField(db_column='OriginStation', null=True, blank=True)
    destination_station = models.TextField(db_column='DestinationStation', null=True, blank=True)
    move_date = models.TextField(db_column='MoveDate', null=True, blank=True)
    departure_time = models.TextField(db_column='DepartureTime', null=True, blank=True)
    purchase_time = models.TextField(db_column='PurchaseTime', null=True, blank=True)
    days_before_departure = models.BigIntegerField(db_column='DaysBeforeDeparture', null=True, blank=True)
    hours_before_departure = models.BigIntegerField(db_column='HoursBeforeDeparture', null=True, blank=True)
    seats_in_ticket = models.BigIntegerField(db_column='SeatsInTicket', null=True, blank=True)
    total_price = models.BigIntegerField(db_column='TotalPrice', null=True, blank=True)
    price = models.BigIntegerField(db_column='Price', null=True, blank=True)
    discount_percent = models.BigIntegerField(db_column='DiscountPercent', null=True, blank=True)
    create_source_type = models.BigIntegerField(db_column='CreateSourceType', null=True, blank=True)
    ticket_status = models.BigIntegerField(db_column='TicketStatus', null=True, blank=True)

    class Meta:
        db_table = 'resamsaledata'
        verbose_name = 'Resam Sale Data'
        verbose_name_plural = 'Resam Sale Data'

    def __str__(self):
        return f'{self.ticket_id} ({self.origin_station} -> {self.destination_station})'


class Route(models.Model):
    origin = models.TextField()
    destinations = models.TextField()

    class Meta:
        db_table = 'route'
        verbose_name = 'Route'
        verbose_name_plural = 'Routes'
        ordering = ['origin', 'destinations']

    def __str__(self):
        return f'{self.origin} به {self.destinations}'


SERVICE_CLASS_CHOICES = [
    ('vip', 'VIP'),
    ('classic_special', 'کلاسیک ویژه'),
]

# ظرفیت اتوبوس بر اساس نوع
CLASS_CAPACITY = {
    'vip': 25,
    'classic_special': 40,
}


class ServiceSummary(models.Model):
    service_id = models.BigIntegerField(unique=True)
    route = models.ForeignKey(
        Route,
        on_delete=models.SET_NULL,
        related_name='services',
        null=True,
        blank=True,
    )
    origins = models.TextField(blank=True, default='')
    destinations = models.TextField(blank=True, default='')
    prices = models.TextField(blank=True, default='')
    total_seats = models.BigIntegerField(default=0)
    service_class = models.CharField(
        max_length=20,
        choices=SERVICE_CLASS_CHOICES,
        null=True,
        blank=True,
        verbose_name='کلاس سرویس',
    )
    max_price = models.BigIntegerField(null=True, blank=True, verbose_name='بیشترین قیمت')
    final_destination = models.TextField(blank=True, default='', verbose_name='مقصد نهایی')
    occupancy_ratio = models.FloatField(null=True, blank=True, verbose_name='ضریب اشغال')

    class Meta:
        db_table = 'service_summary'
        verbose_name = 'Service Summary'
        verbose_name_plural = 'Service Summaries'
        ordering = ['service_id']

    def __str__(self):
        return f'{self.service_id} ({self.origins} -> {self.destinations}) | {self.total_seats} صندلی'


class RoutePriceGroup(models.Model):
    route = models.ForeignKey(
        Route,
        on_delete=models.CASCADE,
        related_name='price_groups',
    )
    max_price = models.BigIntegerField(verbose_name='بیشترین قیمت')
    final_destination = models.TextField(blank=True, default='', verbose_name='مقصد نهایی')
    services_count = models.IntegerField(default=0, verbose_name='تعداد سرویس‌ها')
    service_class = models.CharField(
        max_length=20,
        choices=SERVICE_CLASS_CHOICES,
        null=True,
        blank=True,
        verbose_name='کلاس سرویس',
    )

    class Meta:
        db_table = 'route_price_group'
        verbose_name = 'Route Price Group'
        verbose_name_plural = 'Route Price Groups'
        unique_together = ('route', 'max_price')
        ordering = ['route', '-max_price']

    def __str__(self):
        return f'{self.route} | {self.max_price:,} ({self.final_destination})'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # با انتخاب کلاس، همه‌ی سرویس‌های این روت که گرون‌ترین بلیطشون
        # همین قیمته، همون کلاس + ضریب اشغال رو می‌گیرن.
        if self.service_class:
            capacity = CLASS_CAPACITY[self.service_class]
            ServiceSummary.objects.filter(
                route=self.route,
                max_price=self.max_price,
            ).update(
                service_class=self.service_class,
                occupancy_ratio=models.F('total_seats') * 1.0 / capacity,
            )
