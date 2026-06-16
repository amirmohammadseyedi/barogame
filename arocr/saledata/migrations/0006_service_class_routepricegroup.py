import django.db.models.deletion
from django.db import migrations, models


SERVICE_CLASS_CHOICES = [
    ('vip', 'VIP'),
    ('classic_special', 'کلاسیک ویژه'),
]


class Migration(migrations.Migration):

    dependencies = [
        ('saledata', '0005_route'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicesummary',
            name='service_class',
            field=models.CharField(
                blank=True,
                choices=SERVICE_CLASS_CHOICES,
                max_length=20,
                null=True,
                verbose_name='کلاس سرویس',
            ),
        ),
        migrations.AddField(
            model_name='servicesummary',
            name='max_price',
            field=models.BigIntegerField(blank=True, null=True, verbose_name='بیشترین قیمت'),
        ),
        migrations.AddField(
            model_name='servicesummary',
            name='final_destination',
            field=models.TextField(blank=True, default='', verbose_name='مقصد نهایی'),
        ),
        migrations.CreateModel(
            name='RoutePriceGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('max_price', models.BigIntegerField(verbose_name='بیشترین قیمت')),
                ('final_destination', models.TextField(blank=True, default='', verbose_name='مقصد نهایی')),
                ('services_count', models.IntegerField(default=0, verbose_name='تعداد سرویس‌ها')),
                (
                    'service_class',
                    models.CharField(
                        blank=True,
                        choices=SERVICE_CLASS_CHOICES,
                        max_length=20,
                        null=True,
                        verbose_name='کلاس سرویس',
                    ),
                ),
                (
                    'route',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='price_groups',
                        to='saledata.route',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Route Price Group',
                'verbose_name_plural': 'Route Price Groups',
                'db_table': 'route_price_group',
                'ordering': ['route', '-max_price'],
                'unique_together': {('route', 'max_price')},
            },
        ),
    ]
