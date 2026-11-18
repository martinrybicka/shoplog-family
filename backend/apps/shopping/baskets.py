from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Prefetch, Q
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.views import validated
from apps.audit.models import record
from apps.core.serializers import StrictSerializer

from .models import Basket, Purchase
from .services import lock_actor

User = get_user_model()


def visible_baskets(user):
    return Basket.objects.filter(Q(owner=user) | Q(assignees=user)).distinct()


def member(user):
    return {"id": user.pk, "name": user.display_name or user.username}


class BasketInput(StrictSerializer):
    name = serializers.CharField(max_length=150)
    shopping_list = serializers.CharField(max_length=4000, allow_blank=True, default="")
    assignee_ids = serializers.ListField(child=serializers.UUIDField(), max_length=100, default=list)

    def validate_assignee_ids(self, ids):
        users = list(User.objects.filter(pk__in=ids, is_active=True))
        if len(users) != len(set(ids)):
            raise serializers.ValidationError("Vyberte aktivní členy rodiny.")
        return users


class BasketMembersView(APIView):
    def get(self, request):
        users = (
            User.objects.filter(is_active=True)
            .exclude(pk=request.user.pk)
            .order_by("display_name", "username")
        )
        return Response([member(user) for user in users])


class BasketsView(APIView):
    def get(self, request):
        purchases = Purchase.objects.select_related("created_by").only(
            "id", "basket_id", "store", "total_amount", "created_by__display_name", "created_by__username"
        )
        baskets = visible_baskets(request.user).prefetch_related(
            "assignees", Prefetch("purchases", queryset=purchases)
        )
        return Response(
            [
                {
                    "id": basket.pk,
                    "name": basket.name,
                    "shopping_list": basket.shopping_list,
                    "assignees": [member(user) for user in basket.assignees.all()],
                    "purchases": [
                        {
                            "id": p.pk,
                            "store": p.store,
                            "amount": str(p.total_amount),
                            "author": member(p.created_by)["name"],
                        }
                        for p in basket.purchases.all()
                    ],
                }
                for basket in baskets
            ]
        )

    @transaction.atomic
    def post(self, request):
        lock_actor(request)
        data = dict(validated(BasketInput, request.data))
        assignees = data.pop("assignee_ids")
        basket = Basket.objects.create(owner=request.user, **data)
        basket.assignees.set(assignees)
        record(request, "basket.created", basket)
        return Response({"id": basket.pk}, status=201)
