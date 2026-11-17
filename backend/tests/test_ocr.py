import os
from io import BytesIO
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.shopping.ocr import engine

from .conftest import csrf, login, post
from .synthetic_receipt import receipt_bytes


@pytest.mark.django_db
def test_ocr_requires_owner_and_proposes_without_purchase(admin_client, users):
    image = BytesIO()
    Image.new("RGB", (40, 80), "white").save(image, format="PNG")
    draft = admin_client.post(
        "/api/v1/shopping/drafts/",
        {"file": SimpleUploadedFile("synthetic.png", image.getvalue(), content_type="image/png")},
        format="multipart",
        HTTP_X_CSRFTOKEN=csrf(admin_client),
    ).data["id"]
    path = f"/api/v1/shopping/drafts/{draft}/recognize/"
    with patch("apps.shopping.ocr.engine", return_value=("CELKEM 1234,50 Kc", {"total_amount": "1234.50"})):
        for _ in range(3):
            response = post(admin_client, path)
            assert response.status_code == 200
            assert response.data["suggestions"]["total_amount"] == "1234.50"
        assert post(admin_client, path).status_code == 429
    assert admin_client.get("/api/v1/shopping/purchases/").data["count"] == 0
    from rest_framework.test import APIClient

    other = APIClient(enforce_csrf_checks=True)
    login(other, "user")
    assert post(other, path).status_code == 404
    assert other.get(path).status_code == 404
    assert admin_client.get(path).data["suggestions"]["total_amount"] == "1234.50"


@pytest.mark.skipif(
    os.environ.get("RUN_OCR_INTEGRATION") != "1", reason="Vyžaduje zamčený lokální Tesseract, modely a font."
)
def test_real_local_ocr():
    raw, proposals = engine(receipt_bytes())
    assert proposals["total_amount"] == "1234.50", raw
    assert proposals["date"] == "2026-01-10", raw
