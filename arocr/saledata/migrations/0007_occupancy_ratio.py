from django.db import migrations, models
from django.db.models import F


CLASS_CAPACITY = {
    'vip': 25,
    'classic_special': 40,
}


def assign_class_and_occupancy(apps, schema_editor):
    ServiceSummary = apps.get_model('saledata', 'ServiceSummary')
    RoutePriceGroup = apps.get_model('saledata', 'RoutePriceGroup')

    # ۱) کلاس سرویس را از روی گروه‌های قیمتی کلاس‌بندی‌شده
    #    (تطبیق با روت + بیشترین قیمت/مقصد نهایی) به ساماری‌ها می‌دهیم.
    for group in RoutePriceGroup.objects.exclude(service_class__isnull=True).exclude(service_class=''):
        ServiceSummary.objects.filter(
            route_id=group.route_id,
            max_price=group.max_price,
        ).update(service_class=group.service_class)

    # ۲) ضریب اشغال = صندلی‌های خریداری‌شده ÷ ظرفیت (VIP=25، کلاسیک ویژه=40)
    updated = 0
    for class_code, capacity in CLASS_CAPACITY.items():
        updated += ServiceSummary.objects.filter(service_class=class_code).update(
            occupancy_ratio=F('total_seats') * 1.0 / capacity,
        )

    print(f'[saledata] occupancy_ratio set for {updated} service summaries')


def clear_occupancy(apps, schema_editor):
    ServiceSummary = apps.get_model('saledata', 'ServiceSummary')
    ServiceSummary.objects.update(occupancy_ratio=None)


class Migration(migrations.Migration):

    dependencies = [
        ('saledata', '0006_service_class_routepricegroup'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicesummary',
            name='occupancy_ratio',
            field=models.FloatField(blank=True, null=True, verbose_name='ضریب اشغال'),
        ),
        migrations.RunPython(assign_class_and_occupancy, clear_occupancy),
    ]
