import logging

import jdatetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Carts, ChartAxisType, ChartParameter, CrawlDataTravel, Travel
from .serializers import (
    ChartAxisTypeSerializer,
    ChartDataQuerySerializer,
    ChartDimensionSerializer,
    ChartParameterSerializer,
    ChartPointSerializer,
    CrawlCartsSummarySerializer,
    DefaultDateSerializer,
    TravelSerializer,
)
from .utils import total_capacity_from_crawl_data

logger = logging.getLogger(__name__)


class DefaultDateView(APIView):
    def get(self, request):
        serializer = DefaultDateSerializer({
            'date': jdatetime.date.today().strftime('%Y-%m-%d'),
        })
        return Response(serializer.data)


class TravelsForDateView(APIView):
    def get(self, request):
        date = request.query_params.get('date', '').strip()
        if not date:
            return Response({'travels': []})

        travel_ids = (
            CrawlDataTravel.objects.filter(date=date)
            .values_list('travel_id', flat=True)
            .distinct()
        )
        travels = Travel.objects.filter(id__in=travel_ids).order_by(
            'origin_code',
            'destination_code',
        )
        serializer = TravelSerializer(travels, many=True)
        return Response({'travels': serializer.data})


class ChartDataView(APIView):
    def get(self, request):
        query = ChartDataQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)

        date = query.validated_data['date']
        travel_id = query.validated_data['travel']

        crawls = (
            CrawlDataTravel.objects.filter(date=date, travel_id=travel_id)
            .select_related('travel')
            .order_by('created_at')
        )

        points = [
            {
                'time': crawl.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'total_capacity': total_capacity_from_crawl_data(crawl.data),
                'crawl_id': crawl.id,
            }
            for crawl in crawls
        ]
        serializer = ChartPointSerializer(points, many=True)
        return Response({'points': serializer.data})


class CartsSummaryView(APIView):
    def get(self, request):
        logger.info(
            'CartsSummaryView request: query_params=%s',
            dict(request.query_params),
        )
        query = ChartDataQuerySerializer(data=request.query_params)
        if not query.is_valid():
            logger.info('CartsSummaryView invalid query: errors=%s', query.errors)
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)

        date = query.validated_data['date']
        travel_id = query.validated_data['travel']
        logger.info('CartsSummaryView validated: travel_id=%s date=%s', travel_id, date)

        crawls = (
            CrawlDataTravel.objects.filter(travel_id=travel_id , date=date)
            .order_by('created_at')
        )
        crawl_ids = list(crawls.values_list('id', flat=True))
        logger.info(
            'CartsSummaryView crawls: count=%s ids_head=%s',
            len(crawl_ids),
            crawl_ids[:10],
            crawls[0].date
        )

        carts = (
            Carts.objects.filter(crawl_data_travel_id__in=crawl_ids)
            .select_related('taavoni')
            .order_by('crawl_data_travel_id', 'id')
        )
        logger.info('CartsSummaryView carts: count=%s', carts.count())

        by_crawl = {
            crawl.id: {
                'crawl_id': crawl.id,
                'time': crawl.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'total_capacity': 0,
                'taavoni_capacities': {},
            }
            for crawl in crawls
        }

        # Build a nested map for diffing between consecutive crawls.
        #
        # carts_map structure:
        #   crawl_id -> taavoni_id -> cart_id -> summed_capacity
        #
        # It starts empty for every crawl, then we fill it while iterating over
        # all `Carts` rows we fetched from DB in `for cart in carts:`.
        carts_map = {crawl.id: {} for crawl in crawls}

        for cart in carts:
            row = by_crawl.get(cart.crawl_data_travel_id)
            if row is None:
                continue

            cap = cart.capacity or 0
            avail = cart.availableSeatCount or 0
            row['total_capacity'] += cap

            t = cart.taavoni
            t_id = t.id if t else None
            entry = row['taavoni_capacities'].get(t_id)
            if entry is None:
                entry = {
                    'taavoni_id': t_id,
                    'persian_name': t.persian_name if t else '',
                    'companyNameId': t.companyNameId if t else None,
                    'total_capacity': 0,
                }
                row['taavoni_capacities'][t_id] = entry
            entry['total_capacity'] += cap

            # Put this cart into the correct crawl bucket inside carts_map.
            # (This is where carts_map "gets values".)
            per_t = carts_map.get(cart.crawl_data_travel_id)
            if per_t is None:
                continue
            per_cart = per_t.get(t_id)
            if per_cart is None:
                per_cart = {}
                per_t[t_id] = per_cart
            agg = per_cart.get(cart.cart_id)
            if agg is None:
                agg = {'capacity': 0, 'availableSeatCount': 0}
                per_cart[cart.cart_id] = agg
            agg['capacity'] += cap
            agg['availableSeatCount'] += avail

        samples = []
        # prev_crawl_id tracks the previous crawl in this ordered iteration.
        # It is None only for the first crawl (no "previous" to compare to).
        prev_crawl_id = None
        for crawl in crawls:
            row = by_crawl[crawl.id]
            # Add diffs vs previous crawl for each taavoni based on cart_id -> capacity.
            # curr_by_t = carts for this crawl (grouped by taavoni)
            # prev_by_t = carts for previous crawl (or {} for the first crawl)
            curr_by_t = carts_map.get(crawl.id, {})
            prev_by_t = carts_map.get(prev_crawl_id, {}) if prev_crawl_id else {}

            for t_id, entry in row['taavoni_capacities'].items():
                curr_carts = curr_by_t.get(t_id, {}) or {}
                prev_carts = prev_by_t.get(t_id, {}) or {}

                curr_ids = set(curr_carts.keys())
                prev_ids = set(prev_carts.keys())

                new_ids = sorted(curr_ids - prev_ids)
                removed_ids = sorted(prev_ids - curr_ids)

                changes = []
                for cid in sorted(curr_ids & prev_ids):
                    prev_cap = (prev_carts.get(cid) or {}).get('capacity', 0) or 0
                    curr_cap = (curr_carts.get(cid) or {}).get('capacity', 0) or 0
                    prev_avail = (prev_carts.get(cid) or {}).get('availableSeatCount', 0) or 0
                    curr_avail = (curr_carts.get(cid) or {}).get('availableSeatCount', 0) or 0

                    delta_cap = curr_cap - prev_cap
                    delta_avail = curr_avail - prev_avail

                    if delta_cap or delta_avail:
                        changes.append({
                            'cart_id': cid,
                            'previous_capacity': prev_cap,
                            'current_capacity': curr_cap,
                            'delta': delta_cap,
                            'previous_availableSeatCount': prev_avail,
                            'current_availableSeatCount': curr_avail,
                            'delta_availableSeatCount': delta_avail,
                        })

                # Treat removed carts as a negative delta to 0 for easier review.
                for cid in removed_ids:
                    prev_cap = (prev_carts.get(cid) or {}).get('capacity', 0) or 0
                    prev_avail = (prev_carts.get(cid) or {}).get('availableSeatCount', 0) or 0
                    if prev_cap or prev_avail:
                        changes.append({
                            'cart_id': cid,
                            'previous_capacity': prev_cap,
                            'current_capacity': 0,
                            'delta': -prev_cap,
                            'previous_availableSeatCount': prev_avail,
                            'current_availableSeatCount': 0,
                            'delta_availableSeatCount': -prev_avail,
                        })

                entry['new_cart_ids'] = new_ids
                entry['removed_cart_ids'] = removed_ids
                entry['changes'] = changes

            row['taavoni_capacities'] = list(row['taavoni_capacities'].values())
            samples.append(row)
            # At the end of the loop, remember "this" crawl as the previous one,
            # so the next iteration can compare against it.
            prev_crawl_id = crawl.id

        logger.info('CartsSummaryView response: samples_count=%s', len(samples))
        serializer = CrawlCartsSummarySerializer(samples, many=True)
        return Response({'samples': serializer.data})



class ChartTypeConfigView(APIView):
    def get(self, request):
        axis_types = ChartAxisType.objects.all()
        parameters = ChartParameter.objects.prefetch_related('axis_types').all()

        dimensions = [
            {'value': '2d', 'label': 'دو بعدی', 'axis_count': 2},
            {'value': '3d', 'label': 'سه‌بعدی', 'axis_count': 3},
        ]

        return Response({
            'dimensions': ChartDimensionSerializer(dimensions, many=True).data,
            'axis_types': ChartAxisTypeSerializer(axis_types, many=True).data,
            'parameters': ChartParameterSerializer(parameters, many=True).data,
        })
