import json
import os
from pathlib import Path

from django.db import migrations


JSON_FILENAME = 'exporteddata.json'

FIELD_MAP = {
    'TicketId': 'ticket_id',
    'TicketCode': 'ticket_code',
    'ServiceId': 'service_id',
    'SubServiceId': 'sub_service_id',
    'OriginStation': 'origin_station',
    'DestinationStation': 'destination_station',
    'MoveDate': 'move_date',
    'DepartureTime': 'departure_time',
    'PurchaseTime': 'purchase_time',
    'DaysBeforeDeparture': 'days_before_departure',
    'HoursBeforeDeparture': 'hours_before_departure',
    'SeatsInTicket': 'seats_in_ticket',
    'TotalPrice': 'total_price',
    'Price': 'price',
    'DiscountPercent': 'discount_percent',
    'CreateSourceType': 'create_source_type',
    'TicketStatus': 'ticket_status',
}


def _find_json_path():
    env_path = os.environ.get('SALEDATA_JSON')
    if env_path and Path(env_path).is_file():
        return Path(env_path)

    migration_dir = Path(__file__).resolve().parent
    arocr_dir = migration_dir.parents[1]          # .../arocr
    repo_root = migration_dir.parents[2]          # repo root

    candidates = [
        arocr_dir / JSON_FILENAME,
        repo_root / JSON_FILENAME,
        Path.cwd() / JSON_FILENAME,
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


def load_data(apps, schema_editor):
    json_path = _find_json_path()
    if json_path is None:
        print(
            f'[saledata] {JSON_FILENAME} not found; skipping data import. '
            f'Set SALEDATA_JSON env var or place the file next to manage.py.'
        )
        return

    with open(json_path, 'r', encoding='utf-8') as fh:
        records = json.load(fh)

    ResamSaleData = apps.get_model('saledata', 'ResamSaleData')

    objects = []
    for record in records:
        kwargs = {}
        for json_key, field_name in FIELD_MAP.items():
            kwargs[field_name] = record.get(json_key)
        objects.append(ResamSaleData(**kwargs))

    ResamSaleData.objects.bulk_create(
        objects,
        batch_size=1000,
        ignore_conflicts=True,
    )
    print(f'[saledata] imported {len(objects)} rows from {json_path}')


def unload_data(apps, schema_editor):
    json_path = _find_json_path()
    if json_path is None:
        return

    with open(json_path, 'r', encoding='utf-8') as fh:
        records = json.load(fh)

    ResamSaleData = apps.get_model('saledata', 'ResamSaleData')
    ticket_ids = [record.get('TicketId') for record in records]
    ResamSaleData.objects.filter(ticket_id__in=ticket_ids).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('saledata', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_data, unload_data),
    ]
