import logging

from celery import shared_task

from .models import Travel
from .services import crawl_week_for_travel

logger = logging.getLogger(__name__)


@shared_task(name='safar724.tasks.crawl_today_all_travels')
def crawl_today_all_travels():
    """هر اجرا: برای همه سفرها، از امروز تا ۷ روز آینده را کرال می‌کند (دقیقاً مثل اکشن ادمین)."""
    results = {}

    for travel in Travel.objects.all():
        saved, errors = crawl_week_for_travel(travel)
        results[travel.id] = {
            'saved': len(saved),
            'errors': errors,
        }
        logger.info(
            'crawl_week: travel=%s saved=%s errors=%s',
            travel.id,
            len(saved),
            errors,
        )

    logger.info('crawl_week_all_travels finished')
    return results
