from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, EmployeeViewSet

router = DefaultRouter()
router.register("clients", ClientViewSet, basename="clients")
router.register("employees", EmployeeViewSet, basename="employees")

urlpatterns = router.urls
