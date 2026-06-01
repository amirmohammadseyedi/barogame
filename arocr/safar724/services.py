import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import jdatetime

from .models import CrawlDataTravel

SAFAR724_ROUTE_URL = 'https://service.safar724.com/cs/api/bus/route'
CRAWL_DAYS = 7


def jalali_date_str(day: jdatetime.date) -> str:
    return day.strftime('%Y-%m-%d')


def jalali_week_from_today():
    today = jdatetime.date.today()
    for offset in range(CRAWL_DAYS):
        yield jalali_date_str(today + jdatetime.timedelta(days=offset))


def fetch_route_data(origin_code, destination_code, date):
    params = urlencode({
        'Date': date,
        'Destination': destination_code,
        'Origin': origin_code,
    })
    url = f'{SAFAR724_ROUTE_URL}?{params}'
    request = Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (compatible; arocr/1.0)'},
    )

    try:
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode())
    except HTTPError as exc:
        raise ValueError(f'HTTP {exc.code}: {exc.reason}') from exc
    except URLError as exc:
        raise ValueError(f'Connection error: {exc.reason}') from exc
    except json.JSONDecodeError as exc:
        raise ValueError('Invalid JSON response from Safar724') from exc


def crawl_week_for_travel(travel):
    saved = []
    errors = []

    for date_str in jalali_week_from_today():
        try:
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
            saved.append(crawl)
        except ValueError as exc:
            errors.append(f'{date_str}: {exc}')

    return saved, errors
