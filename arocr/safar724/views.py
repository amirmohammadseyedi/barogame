import jdatetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CrawlDataTravel, Travel
from .serializers import (
    ChartDataQuerySerializer,
    ChartPointSerializer,
    DefaultDateSerializer,
    TravelSerializer,
)
from .utils import total_capacity_from_crawl_data


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
