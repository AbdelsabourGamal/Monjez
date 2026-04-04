from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserCompany
from catalog.models import Product
from organizations.models import Branch, Company
from people.models import Client, Employee

from .models import File
from .serializers import FileReadSerializer, FileUploadSerializer


class FileViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_company = self.request.user.usercompany

        content_types = ContentType.objects.get_for_models(
            UserCompany, Company, Branch, Client, Employee, Product
        )

        company_ids = Company.objects.filter(
            user_company=user_company,
            is_deleted=False
        ).values_list("id", flat=True)

        branch_ids = Branch.objects.filter(
            company__user_company=user_company,
            is_deleted=False
        ).values_list("id", flat=True)

        client_ids = Client.objects.filter(
            company=user_company,
            is_deleted=False
        ).values_list("id", flat=True)

        employee_ids = Employee.objects.filter(
            company=user_company,
            is_deleted=False
        ).values_list("id", flat=True)

        product_ids = Product.objects.filter(
            company__user_company=user_company,
            is_deleted=False
        ).values_list("id", flat=True)

        return File.objects.filter(
            Q(
                content_type=content_types[UserCompany],
                object_id=user_company.id,
            )
            | Q(
                content_type=content_types[Company],
                object_id__in=company_ids,
            )
            | Q(
                content_type=content_types[Branch],
                object_id__in=branch_ids,
            )
            | Q(
                content_type=content_types[Client],
                object_id__in=client_ids,
            )
            | Q(
                content_type=content_types[Employee],
                object_id__in=employee_ids,
            )
            | Q(
                content_type=content_types[Product],
                object_id__in=product_ids,
            )
        ).select_related("content_type", "uploaded_by")


    def get_serializer_class(self):
        if self.action == "create":
            return FileUploadSerializer
        return FileReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file_instance = file_instance = serializer.save()

        return Response(
            FileReadSerializer(file_instance, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )