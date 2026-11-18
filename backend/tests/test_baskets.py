from uuid import uuid4

import pytest
from rest_framework.test import APIClient

from .conftest import login, post


@pytest.mark.django_db
def test_two_assignees_can_record_purchases_in_one_basket(admin_client, users):
    baskets = "/api/v1/shopping/baskets/"
    purchases = "/api/v1/shopping/purchases/"
    clients = [APIClient(enforce_csrf_checks=True) for _ in range(2)]
    for client, username in zip(clients, ["user", "other"], strict=True):
        assert login(client, username).status_code == 200
    private = post(admin_client, baskets, {"name": "Soukromý"}).json()["id"]
    basket = post(
        admin_client,
        baskets,
        {
            "name": "Víkend",
            "assignee_ids": [str(users[name].pk) for name in ["user", "other"]],
        },
    ).json()["id"]
    for index, client in enumerate(clients):
        assert [b["id"] for b in client.get(baskets).json()] == [basket]
        body = {
            "store": f"Obchod {index}",
            "date": "2025-01-01",
            "total_amount": "19.90",
            "category": "FOOD",
        }
        assert (
            post(client, purchases, {**body, "request_key": str(uuid4()), "basket_id": private}).status_code
            == 404
        )
        assert (
            post(client, purchases, {**body, "request_key": str(uuid4()), "basket_id": basket}).status_code
            == 201
        )
    row = next(b for b in admin_client.get(baskets).json() if b["id"] == basket)
    assert {p["store"] for p in row["purchases"]} == {"Obchod 0", "Obchod 1"}
