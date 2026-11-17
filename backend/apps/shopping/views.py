import calendar
from datetime import date

from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.views import validated
from apps.audit.models import record
from apps.core.errors import Problem
from apps.core.pagination import Pagination

from . import services
from .images import validate_image
from .models import Purchase, Receipt, ReceiptDraft
from .serializers import CreateInput, DeleteInput, Filters, MonthInput, UpdateInput


def query():
    return Purchase.objects.select_related("created_by", "receipt").defer(
        "receipt__image", "receipt__preview"
    )


def image_response(content, content_type):
    response = HttpResponse(bytes(content), content_type=content_type)
    response["Content-Disposition"] = (
        'inline; filename="uctenka.' + ("jpg" if content_type == "image/jpeg" else "png") + '"'
    )
    response["X-Content-Type-Options"] = "nosniff"
    return response


class PurchasesView(APIView):
    def get(self, request):
        filters = validated(Filters, request.query_params.dict())
        items = query()
        if filters.get("search"):
            items = items.filter(Q(store__icontains=filters["search"]) | Q(note__icontains=filters["search"]))
        if filters.get("category"):
            items = items.filter(category=filters["category"])
        if filters.get("date_from"):
            items = items.filter(date__gte=filters["date_from"])
        if filters.get("date_to"):
            items = items.filter(date__lte=filters["date_to"])
        paginator = Pagination()
        return paginator.get_paginated_response(
            [services.serialize(item, request.user) for item in paginator.paginate_queryset(items, request)]
        )

    def post(self, request):
        item, created = services.create(request, validated(CreateInput, request.data))
        return Response(services.serialize(item, request.user), status=201 if created else 200)


class PurchaseView(APIView):
    def get(self, request, pk):
        return Response(services.serialize(get_object_or_404(query(), pk=pk), request.user))

    def patch(self, request, pk):
        item = services.update(request, pk, validated(UpdateInput, request.data))
        return Response(services.serialize(item, request.user))

    def delete(self, request, pk):
        services.delete(request, pk, validated(DeleteInput, request.data)["version"])
        return Response(status=204)


class SummaryView(APIView):
    def get(self, request):
        from django.db.models import Count, Sum

        month = validated(
            MonthInput, {"month": request.query_params.get("month", timezone.localdate().strftime("%Y-%m"))}
        )["month"]
        year, number = map(int, month.split("-"))
        items = Purchase.objects.filter(
            date__gte=date(year, number, 1),
            date__lte=date(year, number, calendar.monthrange(year, number)[1]),
        )
        # Jeden SQL dotaz tvoří konzistentní podklad všech součtů.
        groups = list(
            items.order_by()
            .values("category", "store")
            .annotate(count=Count("pk"), amount=Sum("total_amount"))
        )
        return Response(services.summarize(groups, month))


class DraftsView(APIView):
    parser_classes = [MultiPartParser]

    @transaction.atomic
    def post(self, request):
        services.lock_actor(request)
        if ReceiptDraft.objects.filter(created_by=request.user).count() >= 30:
            raise Problem(
                "draft_limit", "Máte 30 rozpracovaných účtenek. Nejprve některé uložte nebo odstraňte.", 409
            )
        if "file" not in request.FILES:
            raise Problem("file_required", "Vyberte fotografii účtenky.")
        data = validate_image(request.FILES["file"])
        draft = ReceiptDraft.objects.create(
            created_by=request.user,
            image=data["original_bytes"],
            preview=data["preview_bytes"],
            content_type=data["content_type"],
        )
        record(request, "receipt.uploaded", draft)
        return Response({"id": str(draft.pk)}, status=201)

    def get(self, request):
        return Response(
            [
                {"id": str(draft.pk), "created_at": draft.created_at.isoformat()}
                for draft in ReceiptDraft.objects.filter(created_by=request.user)
                .defer("image", "preview")
                .order_by("-created_at")
            ]
        )


class DraftView(APIView):
    @transaction.atomic
    def delete(self, request, pk):
        services.lock_actor(request)
        draft = get_object_or_404(ReceiptDraft.objects.select_for_update(), pk=pk, created_by=request.user)
        record(request, "receipt.draft_deleted", draft)
        draft.delete()
        return Response(status=204)


class DraftImageView(APIView):
    def get(self, request, pk):
        draft = get_object_or_404(ReceiptDraft, pk=pk, created_by=request.user)
        return image_response(draft.preview, "image/jpeg")


class ReceiptView(APIView):
    def get(self, request, pk):
        receipt = get_object_or_404(Receipt, purchase_id=pk)
        original = request.query_params.get("original") == "1"
        return image_response(
            receipt.image if original else receipt.preview, receipt.content_type if original else "image/jpeg"
        )


class DraftRecognitionView(APIView):
    @transaction.atomic
    def post(self, request, pk):
        from datetime import timedelta

        from django.db import connection

        from apps.audit.models import AuditEvent

        from .ocr import engine

        services.lock_actor(request)
        draft = get_object_or_404(ReceiptDraft.objects.select_for_update(), pk=pk, created_by=request.user)
        if (
            AuditEvent.objects.filter(
                actor=request.user,
                action="receipt.ocr_attempt",
                occurred_at__gte=timezone.now() - timedelta(minutes=1),
            ).count()
            >= 3
        ):
            raise Problem("ocr_limited", "Rozpoznání lze spustit nejvýše třikrát za minutu.", 429)
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_try_advisory_xact_lock(78173329)")
            if not cursor.fetchone()[0]:
                raise Problem("ocr_busy", "Právě zpracovávám jinou účtenku. Zkuste to za chvíli.", 429)
        record(request, "receipt.ocr_attempt", draft)
        try:
            draft.raw_text, draft.suggestions = engine(bytes(draft.image))
        except Problem as error:
            # Pokus se započítá i při nedostupném enginu; soukromý obsah se neloguje.
            return Response(
                {"error": {"code": error.get_codes(), "message": str(error.detail)}}, status=error.status_code
            )
        draft.save(update_fields=["raw_text", "suggestions"])
        return Response({"suggestions": draft.suggestions, "raw_text": draft.raw_text})

    def get(self, request, pk):
        draft = get_object_or_404(ReceiptDraft, pk=pk, created_by=request.user)
        return Response({"suggestions": draft.suggestions, "raw_text": draft.raw_text})
