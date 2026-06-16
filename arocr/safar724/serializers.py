from rest_framework import serializers

from .models import ChartAxisType, ChartParameter, CrawlDataTravel, Travel


class ChartAxisTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartAxisType
        fields = ('id', 'code', 'label')


class ChartParameterSerializer(serializers.ModelSerializer):
    axis_codes = serializers.SerializerMethodField()

    class Meta:
        model = ChartParameter
        fields = ('id', 'english_name', 'persian_name', 'axis_codes')

    def get_axis_codes(self, obj):
        return list(obj.axis_types.values_list('code', flat=True))


class ChartDimensionSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()
    axis_count = serializers.IntegerField()


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


class TaavoniCapacitySerializer(serializers.Serializer):
    taavoni_id = serializers.IntegerField(allow_null=True)
    persian_name = serializers.CharField(allow_blank=True)
    companyNameId = serializers.IntegerField(allow_null=True)
    total_capacity = serializers.IntegerField()
    new_cart_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
    )
    removed_cart_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
    )
    changes = serializers.ListField(
        child=serializers.DictField(),
        required=False,
    )


class CrawlCartsSummarySerializer(serializers.Serializer):
    crawl_id = serializers.IntegerField()
    time = serializers.CharField()
    total_capacity = serializers.IntegerField()
    taavoni_capacities = TaavoniCapacitySerializer(many=True)


class DefaultDateSerializer(serializers.Serializer):
    date = serializers.CharField()


class ChartDataQuerySerializer(serializers.Serializer):
    date = serializers.CharField(required=True, allow_blank=False)
    travel = serializers.IntegerField(required=True)

    def validate_travel(self, value):
        if not Travel.objects.filter(pk=value).exists():
            raise serializers.ValidationError('Travel not found.')
        return value
