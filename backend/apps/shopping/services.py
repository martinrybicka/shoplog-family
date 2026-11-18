import hashlib
import json
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404

from apps.accounts.models import User
from apps.audit.models import record
from apps.core.errors import Problem

from .models import Purchase, Receipt, ReceiptDraft, Submission


def calculate_items(items):
    rows = []
    total = Decimal("0.00")
    for item in items:
        amount = (item["quantity"] * item["unit_price"]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        rows.append(
            {
                "name": item["name"],
                "quantity": str(item["quantity"]),
                "unit_price": str(item["unit_price"]),
                "total": str(amount),
            }
        )
        total += amount
    return rows, total


def serialize(purchase, user):
    items_total = sum((Decimal(item["total"]) for item in purchase.items), Decimal("0.00"))
    return {
        "id": str(purchase.pk),
        "store": purchase.store,
        "date": purchase.date.isoformat(),
        "total_amount": str(purchase.total_amount),
        "basket_id": str(purchase.basket_id) if purchase.basket_id else None,
        "category": purchase.category,
        "note": purchase.note,
        "items": purchase.items,
        "items_total": str(items_total),
        "difference": str(purchase.total_amount - items_total),
        "currency": "CZK",
        "author": purchase.created_by.display_name or purchase.created_by.username,
        "can_edit": user.system_role == "ADMIN" or purchase.created_by_id == user.pk,
        "has_receipt": hasattr(purchase, "receipt"),
        "version": purchase.version,
    }


def lock_actor(request):
    actor = User.objects.select_for_update().get(pk=request.user.pk)
    if not actor.is_active or actor.auth_epoch != request.session.get("auth_epoch"):
        raise Problem("authentication_required", "Přihlaste se znovu.", 403)
    if actor.must_change_password or request.session.get("password_change_only"):
        raise Problem("password_change_required", "Nejdříve nastavte vlastní heslo.", 403)
    request.user = actor


def authorize(request, item):
    if request.user.system_role != "ADMIN" and item.created_by_id != request.user.pk:
        raise Problem("permission_denied", "Upravovat můžete pouze vlastní nákupy.", 403)


def check_version(item, version):
    if version != item.version:
        raise Problem("conflict", "Nákup mezitím někdo změnil. Načtěte aktuální údaje.", 409)


@transaction.atomic
def create(request, data):
    lock_actor(request)
    data = dict(data)
    key = data.pop("request_key")
    digest = hashlib.sha256(
        json.dumps(data, sort_keys=True, default=str, ensure_ascii=False).encode()
    ).hexdigest()
    previous = Submission.objects.filter(user=request.user, key=key).first()
    if previous:
        if previous.payload_hash != digest:
            raise Problem("conflict", "Tento požadavek již obsahoval jiné údaje.", 409)
        item = Purchase.objects.select_related("created_by", "receipt").filter(pk=previous.result_id).first()
        if not item:
            raise Problem("deleted", "Původní nákup byl odstraněn. Opakování jej neobnoví.", 409)
        return item, False
    draft_id = data.pop("draft_id", None)
    draft = (
        get_object_or_404(ReceiptDraft.objects.select_for_update(), pk=draft_id, created_by=request.user)
        if draft_id
        else None
    )
    if "basket_id" in data and data["basket_id"]:
        from .baskets import visible_baskets

        get_object_or_404(visible_baskets(request.user), pk=data["basket_id"])
    data["items"], _ = calculate_items(data["items"])
    item = Purchase.objects.create(**data, created_by=request.user, updated_by=request.user)
    if draft:
        Receipt.objects.create(
            purchase=item, image=draft.image, preview=draft.preview, content_type=draft.content_type
        )
        draft.delete()
    Submission.objects.create(user=request.user, key=key, payload_hash=digest, result_id=item.pk)
    record(request, "purchase.created", item)
    return item, True


@transaction.atomic
def update(request, pk, data):
    lock_actor(request)
    item = get_object_or_404(Purchase.objects.select_for_update(), pk=pk)
    authorize(request, item)
    data = dict(data)
    check_version(item, data.pop("version"))
    if "basket_id" in data and data["basket_id"]:
        from .baskets import visible_baskets

        get_object_or_404(visible_baskets(request.user), pk=data["basket_id"])
    data["items"], _ = calculate_items(data["items"])
    for field, value in data.items():
        setattr(item, field, value)
    item.version += 1
    item.updated_by = request.user
    item.save()
    record(request, "purchase.updated", item)
    return item


@transaction.atomic
def delete(request, pk, version):
    lock_actor(request)
    item = get_object_or_404(Purchase.objects.select_for_update(), pk=pk)
    authorize(request, item)
    check_version(item, version)
    record(request, "purchase.deleted", item)
    item.delete()


def summarize(groups, month):
    total = Decimal("0.00")
    count = 0
    categories = {}
    stores = {}
    for group in groups:
        total += group["amount"]
        count += group["count"]
        for key, target in [("category", categories), ("store", stores)]:
            row = target.setdefault(group[key], {"count": 0, "amount": Decimal("0.00")})
            row["count"] += group["count"]
            row["amount"] += group["amount"]
    return {
        "month": month,
        "currency": "CZK",
        "count": count,
        "total_amount": str(total),
        "categories": [
            {
                "category": key,
                "label": label,
                "count": categories[key]["count"],
                "total_amount": str(categories[key]["amount"]),
            }
            for key, label in Purchase.Category.choices
            if key in categories
        ],
        "stores": [
            {"store": key, "count": row["count"], "total_amount": str(row["amount"])}
            for key, row in sorted(stores.items(), key=lambda entry: (-entry[1]["amount"], entry[0]))[:8]
        ],
    }
