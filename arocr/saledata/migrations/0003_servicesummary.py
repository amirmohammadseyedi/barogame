from collections import OrderedDict

from django.db import migrations, models


def _fmt_price(price):
    if price is None:
        return '-'
    return f'{price:,}'


def populate_summaries(apps, schema_editor):
    ResamSaleData = apps.get_model('saledata', 'ResamSaleData')
    ServiceSummary = apps.get_model('saledata', 'ServiceSummary')

    groups = OrderedDict()

    rows = ResamSaleData.objects.all().values(
        'service_id',
        'origin_station',
        'destination_station',
        'price',
        'seats_in_ticket',
    )

    for row in rows:
        service_id = row['service_id']
        if service_id is None:
            continue

        group = groups.setdefault(service_id, {
            'origins': OrderedDict(),
            'destinations': OrderedDict(),
            'prices': OrderedDict(),
            'total_seats': 0,
        })

        origin = (row['origin_station'] or '').strip()
        destination = (row['destination_station'] or '').strip()

        if origin:
            group['origins'][origin] = True
        if destination:
            group['destinations'][destination] = True
        if row['price'] is not None:
            group['prices'][row['price']] = True

        group['total_seats'] += row['seats_in_ticket'] or 0

    summaries = [
        ServiceSummary(
            service_id=service_id,
            origins=' / '.join(group['origins']),
            destinations=' / '.join(group['destinations']),
            prices=' / '.join(_fmt_price(p) for p in group['prices']),
            total_seats=group['total_seats'],
        )
        for service_id, group in groups.items()
    ]

    ServiceSummary.objects.bulk_create(
        summaries,
        batch_size=1000,
        ignore_conflicts=True,
    )
    print(f'[saledata] created {len(summaries)} service summaries')


def clear_summaries(apps, schema_editor):
    ServiceSummary = apps.get_model('saledata', 'ServiceSummary')
    ServiceSummary.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('saledata', '0002_import_exported_data'),
    ]

    operations = [
        migrations.CreateModel(
            name='ServiceSummary',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('service_id', models.BigIntegerField(unique=True)),
                ('origins', models.TextField(blank=True, default='')),
                ('destinations', models.TextField(blank=True, default='')),
                ('prices', models.TextField(blank=True, default='')),
                ('total_seats', models.BigIntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Service Summary',
                'verbose_name_plural': 'Service Summaries',
                'db_table': 'service_summary',
                'ordering': ['service_id'],
            },
        ),
        migrations.RunPython(populate_summaries, clear_summaries),
    ]
