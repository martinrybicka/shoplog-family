from datetime import date
from decimal import Decimal
from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.shopping.models import Purchase

from .conftest import login

PATH = "/api/v1/shopping/warranties/"


@pytest.mark.django_db
def test_warranties_follow_family_access_and_calendar_years(users):
    owner = users["admin"]
    for store, day, category in [
        ("Potraviny", date(2025, 1, 1), "FOOD"),
        ("Přestupný den", date(2024, 2, 29), "ELECTRONICS"),
        ("Dnes", date(2024, 3, 1), "OTHER"),
        ("Za 30 dní", date(2024, 3, 31), "DRUGSTORE"),
        ("Později", date(2024, 4, 1), "CLOTHING"),
        ("Domácnost", date(2025, 2, 1), "HOUSEHOLD"),
    ]:
        Purchase.objects.create(
            store=store,
            date=day,
            category=category,
            total_amount=Decimal("10.00"),
            created_by=owner,
            updated_by=owner,
        )

    client = APIClient(enforce_csrf_checks=True)
    assert client.get(PATH).status_code == 403
    assert login(client, "user").status_code == 200
    with patch("apps.shopping.warranties.timezone.localdate", return_value=date(2026, 3, 1)):
        response = client.get(PATH + "?status=all")
        assert response.status_code == 200
        assert "no-store" in response["Cache-Control"]
        by_store = {row["store"]: row for row in response.json()["results"]}
        assert set(by_store) == {"Přestupný den", "Dnes", "Za 30 dní", "Později", "Domácnost"}
        assert by_store["Přestupný den"]["ends_on"] == "2026-02-28"
        assert by_store["Přestupný den"]["status"] == "expired"
        assert by_store["Dnes"]["status"] == "soon"
        assert by_store["Dnes"]["days_left"] == 0
        assert by_store["Za 30 dní"]["status"] == "soon"
        assert by_store["Později"]["status"] == "active"
        soon = client.get(PATH + "?status=soon").json()
        assert [row["store"] for row in soon["results"]] == ["Dnes", "Za 30 dní"]
        assert client.get(PATH + "?status=expired").json()["count"] == 1
        assert client.get(PATH + "?category=HOUSEHOLD").json()["count"] == 1
        assert client.get(PATH + "?search=pozdě").json()["count"] == 1
        assert client.get(PATH + "?status=bad").status_code == 400
