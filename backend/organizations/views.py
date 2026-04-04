# organizations/views.py

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Prefetch

from .models import Company, Branch
from .serializers import CompanySerializer, BranchSerializer


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Company.objects
            .filter(
                user_company=self.request.user.usercompany,
                is_deleted=False
            )
            .prefetch_related("attachments", "branches__attachments")
        )

    def perform_create(self, serializer):
        serializer.save(
            user_company=self.request.user.usercompany
        )


class BranchViewSet(viewsets.ModelViewSet):
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Branch.objects
            .filter(
                company__user_company=self.request.user.usercompany,
                is_deleted=False
            )
            .select_related("company")
            .prefetch_related("attachments")
        )

    def perform_create(self, serializer):
        company = serializer.validated_data["company"]

        # 🔐 VALIDATION: prevent cross-tenant access
        if company.user_company != self.request.user.usercompany:
            raise PermissionError("Invalid company")

        serializer.save()