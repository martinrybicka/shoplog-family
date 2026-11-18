from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from apps.core.serializers import StrictSerializer

from .models import Purchase


class ItemInput(StrictSerializer):
    name = serializers.CharField(max_length=150)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=3, min_value=Decimal("0.001"))
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0"))


class PurchaseInput(StrictSerializer):
    basket_id = serializers.UUIDField(required=False, allow_null=True)
    store = serializers.CharField(max_length=150)
    date = serializers.DateField()
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"))
    category = serializers.ChoiceField(choices=Purchase.Category.choices)
    note = serializers.CharField(max_length=2000, allow_blank=True, default="")
    items = ItemInput(many=True, max_length=200, default=list)

    def validate_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Datum nákupu nesmí být v budoucnosti.")
        return value


class CreateInput(PurchaseInput):
    request_key = serializers.UUIDField()
    draft_id = serializers.UUIDField(required=False, allow_null=True)


class UpdateInput(PurchaseInput):
    version = serializers.IntegerField(min_value=1)


class DeleteInput(StrictSerializer):
    version = serializers.IntegerField(min_value=1)


class Filters(StrictSerializer):
    search = serializers.CharField(max_length=150, required=False, allow_blank=True)
    category = serializers.ChoiceField(choices=Purchase.Category.choices, required=False, allow_blank=True)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    page = serializers.IntegerField(min_value=1, required=False)

    def validate(self, data):
        if data.get("date_from") and data.get("date_to") and data["date_from"] > data["date_to"]:
            raise serializers.ValidationError("Začátek období musí být před koncem.")
        return data


class MonthInput(StrictSerializer):
    month = serializers.RegexField(r"^\d{4}-(0[1-9]|1[0-2])$")

    def validate_month(self, value):
        if int(value[:4]) < 1 or int(value[:4]) >= 9999:
            raise serializers.ValidationError("Neplatný rok.")
        return value
