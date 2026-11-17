from decimal import Decimal
from io import BytesIO
from uuid import uuid4

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from apps.shopping.services import calculate_items

from .conftest import csrf, login, post


def test_decimal_rounding():
    rows, total = calculate_items(
        [{"name": "Jablka", "quantity": Decimal("0.125"), "unit_price": Decimal("29.00")}]
    )
    assert total == Decimal("3.63")
    assert rows[0]["total"] == "3.63"


@pytest.mark.django_db
class TestShopping:
    def payload(self, **changes):
        return {
            "request_key": str(uuid4()),
            "store": "Zkušební obchod",
            "date": "2026-01-10",
            "total_amount": "103.63",
            "category": "FOOD",
            "note": "",
            "items": [{"name": "Jablka", "quantity": "0.125", "unit_price": "29.00"}],
            **changes,
        }

    def test_create_summary_and_replay(self, admin_client):
        body = self.payload()
        first = post(admin_client, "/api/v1/shopping/purchases/", body)
        assert first.status_code == 201, first.data
        assert first.data["items_total"] == "3.63"
        assert first.data["difference"] == "100.00"
        again = post(admin_client, "/api/v1/shopping/purchases/", body)
        assert again.status_code == 200
        assert again.data["id"] == first.data["id"]
        assert post(admin_client, "/api/v1/shopping/purchases/", {**body, "store": "Jiný"}).status_code == 409
        summary = admin_client.get("/api/v1/shopping/summary/?month=2026-01").data
        assert summary["total_amount"] == "103.63"
        assert summary["count"] == 1
        assert summary["categories"][0]["total_amount"] == "103.63"

    def test_family_read_author_edit_and_admin_delete(self, admin_client, users):
        other = APIClient(enforce_csrf_checks=True)
        assert login(other, "user").status_code == 200
        purchase = post(other, "/api/v1/shopping/purchases/", self.payload()).data
        stranger = APIClient(enforce_csrf_checks=True)
        assert login(stranger, "other").status_code == 200
        path = f"/api/v1/shopping/purchases/{purchase['id']}/"
        assert stranger.get(path).status_code == 200
        body = {k: v for k, v in self.payload().items() if k != "request_key"}
        body["version"] = 1
        assert stranger.patch(path, body, format="json", HTTP_X_CSRFTOKEN=csrf(stranger)).status_code == 403
        assert other.patch(path, body, format="json", HTTP_X_CSRFTOKEN=csrf(other)).status_code == 200
        assert other.patch(path, body, format="json", HTTP_X_CSRFTOKEN=csrf(other)).status_code == 409
        assert (
            admin_client.delete(
                path, {"version": 2}, format="json", HTTP_X_CSRFTOKEN=csrf(admin_client)
            ).status_code
            == 204
        )
        assert admin_client.get(path).status_code == 404

    def test_private_draft_and_receipt(self, admin_client, users):
        output = BytesIO()
        Image.new("RGB", (30, 60), "white").save(output, format="PNG")
        image = SimpleUploadedFile("synteticka.png", output.getvalue(), content_type="image/png")
        draft = admin_client.post(
            "/api/v1/shopping/drafts/",
            {"file": image},
            format="multipart",
            HTTP_X_CSRFTOKEN=csrf(admin_client),
        )
        assert draft.status_code == 201, draft.data
        other = APIClient(enforce_csrf_checks=True)
        login(other, "user")
        path = f"/api/v1/shopping/drafts/{draft.data['id']}/image/"
        assert other.get(path).status_code == 404
        assert admin_client.get(path)["Cache-Control"] == "private, no-store"
        body = self.payload(draft_id=draft.data["id"])
        saved = post(admin_client, "/api/v1/shopping/purchases/", body)
        assert saved.status_code == 201, saved.data
        assert other.get(f"/api/v1/shopping/purchases/{saved.data['id']}/receipt/").status_code == 200
        assert (
            post(
                admin_client, "/api/v1/shopping/purchases/", self.payload(draft_id=draft.data["id"])
            ).status_code
            == 404
        )
        assert admin_client.get(path).status_code == 404

    def test_access_and_validation(self, admin_client, users):
        anonymous = APIClient()
        for path in ["purchases/", "summary/", f"purchases/{uuid4()}/receipt/"]:
            assert anonymous.get("/api/v1/shopping/" + path).status_code == 403
        no_csrf = APIClient(enforce_csrf_checks=True)
        login(no_csrf)
        assert no_csrf.post("/api/v1/shopping/purchases/", self.payload(), format="json").status_code == 403
        for change in [
            {"total_amount": "-1.00"},
            {"total_amount": "1.001"},
            {"date": "2099-01-01"},
            {"store": ""},
            {"category": "BAD"},
            {"items": [{"name": "x", "quantity": "0", "unit_price": "1"}]},
        ]:
            assert (
                post(admin_client, "/api/v1/shopping/purchases/", self.payload(**change)).status_code == 400
            )
        assert admin_client.get("/api/v1/shopping/summary/?month=wrong").status_code == 400
        assert (
            admin_client.get(
                "/api/v1/shopping/purchases/?date_from=2026-02-01&date_to=2026-01-01"
            ).status_code
            == 400
        )
        fake = SimpleUploadedFile("fake.png", b"not an image", content_type="image/png")
        assert (
            admin_client.post(
                "/api/v1/shopping/drafts/",
                {"file": fake},
                format="multipart",
                HTTP_X_CSRFTOKEN=csrf(admin_client),
            ).status_code
            == 400
        )
        users["admin"].is_active = False
        users["admin"].save()
        assert admin_client.get("/api/v1/shopping/purchases/").status_code == 403

    def test_filters_and_tombstone(self, admin_client):
        body = self.payload()
        saved = post(admin_client, "/api/v1/shopping/purchases/", body).data
        assert admin_client.get("/api/v1/shopping/purchases/?search=neexistuje").data["count"] == 0
        assert admin_client.get("/api/v1/shopping/purchases/?category=FOOD").data["count"] == 1
        path = f"/api/v1/shopping/purchases/{saved['id']}/"
        assert (
            admin_client.delete(
                path, {"version": 1}, format="json", HTTP_X_CSRFTOKEN=csrf(admin_client)
            ).status_code
            == 204
        )
        assert post(admin_client, "/api/v1/shopping/purchases/", body).status_code == 409

    def test_restricted_session(self, admin_client, users):
        users["admin"].must_change_password = True
        users["admin"].save()
        assert admin_client.get("/api/v1/shopping/purchases/").status_code == 403


def test_ocr_proposals_are_conservative():
    from apps.shopping.ocr import parse_tsv

    def tsv(lines):
        return "page_num\tblock_num\tpar_num\tline_num\tconf\ttext\n" + "\n".join(
            f"1\t1\t1\t{i}\t95\t{line}" for i, line in enumerate(lines)
        )

    raw, result = parse_tsv(
        tsv(
            [
                "Zkušební obchod s.r.o.",
                "Datum 10.01.2026",
                "CELKEM 1 234,50 Kč",
                "Hotovost 2 000,00 Kč",
                "Vráceno 765,50 Kč",
            ]
        )
    )
    assert result["total_amount"] == "1234.50"
    assert result["date"] == "2026-01-10"
    assert result["store"] == "Zkušební obchod s.r.o."
    assert "Hotovost" in raw
    _, ambiguous = parse_tsv(tsv(["CELKEM 123,00 Kč", "CELKEM 124,00 Kč"]))
    assert "total_amount" not in ambiguous
