import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class Basket(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    shopping_list = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    assignees = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="assigned_baskets", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class Purchase(models.Model):
    class Category(models.TextChoices):
        FOOD = "FOOD", "Potraviny"
        HOUSEHOLD = "HOUSEHOLD", "Domácnost"
        DRUGSTORE = "DRUGSTORE", "Drogerie"
        CLOTHING = "CLOTHING", "Oblečení"
        ELECTRONICS = "ELECTRONICS", "Elektronika"
        OTHER = "OTHER", "Ostatní"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    basket = models.ForeignKey(
        Basket, null=True, blank=True, on_delete=models.PROTECT, related_name="purchases"
    )
    store = models.CharField(max_length=150)
    date = models.DateField(db_index=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
    category = models.CharField(max_length=20, choices=Category.choices)
    note = models.CharField(max_length=2000, blank=True)
    items = models.JSONField(default=list)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="purchases"
    )
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at", "-id"]
        constraints = [
            models.CheckConstraint(condition=Q(total_amount__gte=0), name="purchase_nonnegative_amount"),
            models.CheckConstraint(condition=Q(version__gte=1), name="purchase_positive_version"),
            models.CheckConstraint(
                condition=Q(
                    category__in=["FOOD", "HOUSEHOLD", "DRUGSTORE", "CLOTHING", "ELECTRONICS", "OTHER"]
                ),
                name="purchase_known_category",
            ),
        ]


class ReceiptDraft(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    image = models.BinaryField()
    preview = models.BinaryField()
    content_type = models.CharField(max_length=30)
    raw_text = models.TextField(blank=True)
    suggestions = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)


class Receipt(models.Model):
    purchase = models.OneToOneField(
        Purchase, primary_key=True, on_delete=models.CASCADE, related_name="receipt"
    )
    image = models.BinaryField()
    preview = models.BinaryField()
    content_type = models.CharField(max_length=30)


class Submission(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    key = models.UUIDField()
    payload_hash = models.CharField(max_length=64)
    result_id = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "key"], name="submission_user_key")]
