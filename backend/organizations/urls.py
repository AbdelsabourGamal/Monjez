# organizations/urls.py

from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, BranchViewSet

router = DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="companies")
router.register(r"branches", BranchViewSet, basename="branches")

urlpatterns = router.urls