from django.urls import path

from .views import (
    DraftImageView,
    DraftRecognitionView,
    DraftsView,
    DraftView,
    PurchasesView,
    PurchaseView,
    ReceiptView,
    SummaryView,
)

urlpatterns = [
    path("purchases/", PurchasesView.as_view()),
    path("purchases/<uuid:pk>/", PurchaseView.as_view()),
    path("purchases/<uuid:pk>/receipt/", ReceiptView.as_view()),
    path("drafts/<uuid:pk>/recognize/", DraftRecognitionView.as_view()),
    path("summary/", SummaryView.as_view()),
    path("drafts/", DraftsView.as_view()),
    path("drafts/<uuid:pk>/", DraftView.as_view()),
    path("drafts/<uuid:pk>/image/", DraftImageView.as_view()),
]
