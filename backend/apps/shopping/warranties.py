from datetime import timedelta

from django.db.models import DateField, DurationField, F, Func, Q, Value
from django.db.models.functions import Cast
from django.utils import timezone
from rest_framework import serializers
from rest_framework.views import APIView

from apps.accounts.views import validated
from apps.core.pagination import Pagination
from apps.core.serializers import StrictSerializer

from .models import Purchase

SOON_DAYS = 30


class WarrantyFilters(StrictSerializer):
    status = serializers.ChoiceField(choices=("current", "soon", "expired", "all"), default="current")
    category = serializers.ChoiceField(
        choices=[(key, label) for key, label in Purchase.Category.choices if key != Purchase.Category.FOOD],
        allow_blank=True,
        default="",
    )
    search = serializers.CharField(max_length=150, allow_blank=True, default="")
    page = serializers.IntegerField(min_value=1, required=False)


def warranty_status(days_left):
    if days_left < 0:
        return "expired"
    return "soon" if days_left <= SOON_DAYS else "active"


class WarrantiesView(APIView):
    def get(self, request):
        filters = validated(WarrantyFilters, request.query_params.dict())
        today = timezone.localdate()
        # Kalendářní roky v PostgreSQL: 29. únor se v nepřestupném roce posune na 28. února.
        two_years = Func(Value(2), function="make_interval", output_field=DurationField())
        purchases = (
            Purchase.objects.exclude(category=Purchase.Category.FOOD)
            .annotate(ends_on=Cast(F("date") + two_years, DateField()))
            .select_related("receipt")
            .defer("receipt__image", "receipt__preview")
        )
        if filters["category"]:
            purchases = purchases.filter(category=filters["category"])
        if filters["search"]:
            text = filters["search"]
            purchases = purchases.filter(Q(store__icontains=text) | Q(note__icontains=text))

        status = filters["status"]
        if status == "soon":
            purchases = purchases.filter(ends_on__range=(today, today + timedelta(days=SOON_DAYS)))
        elif status == "current":
            purchases = purchases.filter(ends_on__gte=today)
        elif status == "expired":
            purchases = purchases.filter(ends_on__lt=today)

        if status in ("current", "soon"):
            purchases = purchases.order_by("ends_on", "date", "id")
        else:
            purchases = purchases.order_by("-ends_on", "-date", "-id")

        paginator = Pagination()
        results = []
        for purchase in paginator.paginate_queryset(purchases, request):
            days_left = (purchase.ends_on - today).days
            results.append(
                {
                    "id": purchase.id,
                    "store": purchase.store,
                    "date": purchase.date,
                    "category": purchase.category,
                    "ends_on": purchase.ends_on,
                    "status": warranty_status(days_left),
                    "days_left": days_left,
                    "has_receipt": hasattr(purchase, "receipt"),
                    "item_names": [item["name"] for item in purchase.items],
                }
            )
        return paginator.get_paginated_response(results)
