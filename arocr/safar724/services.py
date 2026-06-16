import json
import random
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import jdatetime

from .models import Carts, CrawlDataTravel

SAFAR724_ROUTE_URL = 'https://service.safar724.com/cs/api/bus/route'
CRAWL_DAYS = 7
REQUEST_DELAY_MIN = 3
REQUEST_DELAY_MAX = 7


def jalali_date_str(day: jdatetime.date) -> str:
    return day.strftime('%Y-%m-%d')


def jalali_week_from_today():
    today = jdatetime.date.today()
    for offset in range(CRAWL_DAYS):
        yield jalali_date_str(today + jdatetime.timedelta(days=offset))


HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
    'Referer': 'https://www.safar724.com/',
    'Connection': 'keep-alive',
}


def fetch_route_data(origin_code, destination_code, date):
    params = urlencode({
        'Date': date,
        'Destination': destination_code,
        'Origin': origin_code,
    })
    url = f'{SAFAR724_ROUTE_URL}?{params}'
    request = Request(url, headers=HEADERS)

    try:
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode())
    except HTTPError as exc:
        raise ValueError(f'HTTP {exc.code}: {exc.reason}') from exc
    except URLError as exc:
        raise ValueError(f'Connection error: {exc.reason}') from exc
    except json.JSONDecodeError as exc:
        raise ValueError('Invalid JSON response from Safar724') from exc


def _save_crawl_for_date(travel, date_str):
    data = fetch_route_data(
        travel.origin_code,
        travel.destination_code,
        date_str,
    )
    crawl = CrawlDataTravel.objects.create(
        travel=travel,
        date=date_str,
        data=data,
    )

    items = data.get('items', []) if isinstance(data, dict) else []
    if isinstance(items, list):
        for item in items:
            if not isinstance(item, dict):
                continue

            cart_id = item.get('id')
            if cart_id is None:
                continue

            company_persian_name = (item.get('companyPersianName') or '').strip()
            if not company_persian_name:
                continue

            capacity = item.get('capacity', 0)
            try:
                capacity = int(capacity) if capacity is not None else 0
            except (TypeError, ValueError):
                capacity = 0

            available_seat_count = item.get('availableSeatCount', 0)
            try:
                available_seat_count = (
                    int(available_seat_count) if available_seat_count is not None else 0
                )
            except (TypeError, ValueError):
                available_seat_count = 0

            company_name_id = item.get('companyId')

            # Create a new record each crawl (no updates),
            # while `Carts.save()` will ensure Taavoni linkage.
            Carts.objects.create(
                crawl_data_travel=crawl,
                cart_id=cart_id,
                companyPersianName=company_persian_name,
                companyNameId=company_name_id,
                capacity=capacity,
                availableSeatCount=available_seat_count,
            )

    return crawl


def crawl_single_date_for_travel(travel, date_str):
    saved = []
    errors = []
    try:
        saved.append(_save_crawl_for_date(travel, date_str))
    except ValueError as exc:
        errors.append(f'{date_str}: {exc}')
    return saved, errors


def crawl_today_for_travel(travel):
    today = jalali_date_str(jdatetime.date.today())
    return crawl_single_date_for_travel(travel, today)


def crawl_week_for_travel(travel):
    saved = []
    errors = []

    dates = list(jalali_week_from_today())
    for i, date_str in enumerate(dates):
        date_saved, date_errors = crawl_single_date_for_travel(travel, date_str)
        saved.extend(date_saved)
        errors.extend(date_errors)

        if i < len(dates) - 1:
            delay = random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX)
            time.sleep(delay)

    return saved, errors
