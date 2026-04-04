from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(
            company=self.request.user.usercompany,
            is_deleted=False
        ).prefetch_related(
            "prices",
            "inventory",
            "attachments"
        )

    def perform_create(self, serializer):
        serializer.save()