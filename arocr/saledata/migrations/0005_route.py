from collections import OrderedDict

import django.db.models.deletion
from django.db import migrations, models


SEPARATOR = ' / '


def _split(value):
    return [part.strip() for part in (value or '').split('/') if part.strip()]


def populate_routes(apps, schema_editor):
    Route = apps.get_model('saledata', 'Route')
    ServiceSummary = apps.get_model('saledata', 'ServiceSummary')

    # سرویس‌ها را بر اساس مبدا گروه می‌کنیم و در هر مبدا،
    # مجموعه‌مقصدهایی که اشتراک دارند را در یک مسیر ادغام می‌کنیم.
    by_origin = OrderedDict()
    for service in ServiceSummary.objects.all().order_by('service_id'):
        origin = (service.origins or '').strip()
        dest_set = set(_split(service.destinations))
        if not origin or not dest_set:
            continue

        groups = by_origin.setdefault(origin, [])

        # هر گروه: {'dests': set, 'order': [به ترتیب دیده‌شدن], 'services': [pk]}
        matched = [g for g in groups if g['dests'] & dest_set]

        if matched:
            target = matched[0]
            # اگر چند گروه با هم اشتراک پیدا کردند، همه را در اولی ادغام کن
            for extra in matched[1:]:
                target['dests'] |= extra['dests']
                for d in extra['order']:
                    if d not in target['order']:
                        target['order'].append(d)
                target['services'].extend(extra['services'])
                groups.remove(extra)
        else:
            target = {'dests': set(), 'order': [], 'services': []}
            groups.append(target)

        target['dests'] |= dest_set
        for d in _split(service.destinations):
            if d not in target['order']:
                target['order'].append(d)
        target['services'].append(service.pk)

    route_count = 0
    for origin, groups in by_origin.items():
        for group in groups:
            route = Route.objects.create(
                origin=origin,
                destinations=SEPARATOR.join(group['order']),
            )
            ServiceSummary.objects.filter(pk__in=group['services']).update(route=route)
            route_count += 1

    print(f'[saledata] created {route_count} routes')


def clear_routes(apps, schema_editor):
    Route = apps.get_model('saledata', 'Route')
    Route.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('saledata', '0004_delete_single_seat_services'),
    ]

    operations = [
        migrations.CreateModel(
            name='Route',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('origin', models.TextField()),
                ('destinations', models.TextField()),
            ],
            options={
                'verbose_name': 'Route',
                'verbose_name_plural': 'Routes',
                'db_table': 'route',
                'ordering': ['origin', 'destinations'],
            },
        ),
        migrations.AddField(
            model_name='servicesummary',
            name='route',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='services',
                to='saledata.route',
            ),
        ),
        migrations.RunPython(populate_routes, clear_routes),
    ]
