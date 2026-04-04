from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import AuthViewSet, CompanySettingsViewSet, CompanyViewSet, BankAccountViewSet


router = DefaultRouter()
router.register("auth", AuthViewSet, basename="auth")
router.register("", CompanyViewSet, basename="company")
router.register("settings", CompanySettingsViewSet, basename="company-settings")
router.register("bank", BankAccountViewSet, basename="bank-account")


urlpatterns = [
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
] + router.urls