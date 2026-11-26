from django.urls import path

from .baskets import BasketMembersView, BasketsView
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
from .warranties import WarrantiesView

urlpatterns = [
    path("warranties/", WarrantiesView.as_view()),
    path("baskets/", BasketsView.as_view()),
    path("basket-members/", BasketMembersView.as_view()),
    path("purchases/", PurchasesView.as_view()),
    path("purchases/<uuid:pk>/", PurchaseView.as_view()),
    path("purchases/<uuid:pk>/receipt/", ReceiptView.as_view()),
    path("drafts/<uuid:pk>/recognize/", DraftRecognitionView.as_view()),
    path("summary/", SummaryView.as_view()),
    path("drafts/", DraftsView.as_view()),
    path("drafts/<uuid:pk>/", DraftView.as_view()),
    path("drafts/<uuid:pk>/image/", DraftImageView.as_view()),
]
