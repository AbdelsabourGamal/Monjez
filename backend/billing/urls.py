from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PlanViewSet,
    SubscriptionViewSet,
    PaymentViewSet,
    PaymentWebhookViewSet,
)

router = DefaultRouter()
router.register("", SubscriptionViewSet, basename="subscription")
router.register("plans", PlanViewSet, basename="plans")
router.register("payments", PaymentViewSet, basename="payments")
router.register("webhook", PaymentWebhookViewSet, basename="webhook")

urlpatterns = [
    path("", include(router.urls)),
]