from rest_framework import serializers

from .models import CrawlDataTravel, Travel


class TravelSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    class Meta:
        model = Travel
        fields = ('id', 'origin_code', 'destination_code', 'label')

    def get_label(self, obj):
        return str(obj)


class ChartPointSerializer(serializers.Serializer):
    time = serializers.CharField()
    total_capacity = serializers.IntegerField()
    crawl_id = serializers.IntegerField()


class DefaultDateSerializer(serializers.Serializer):
    date = serializers.CharField()


class ChartDataQuerySerializer(serializers.Serializer):
    date = serializers.CharField(required=True, allow_blank=False)
    travel = serializers.IntegerField(required=True)

    def validate_travel(self, value):
        if not Travel.objects.filter(pk=value).exists():
            raise serializers.ValidationError('Travel not found.')
        return value
