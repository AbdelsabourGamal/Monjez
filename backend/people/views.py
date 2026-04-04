from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from .models import Client, ClientIdentifier, Employee
from .serializers import ClientListSerializer, ClientDetailSerializer, ClientCreateUpdateSerializer, ClientIdentifierSerializer, EmployeeListSerializer, EmployeeDetailSerializer, EmployeeCreateUpdateSerializer
from rest_framework.exceptions import NotFound
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

class ClientViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_client(self):
        try:
            return Client.objects.get(
                id=self.kwargs.get("pk"),
                company=self.request.user.usercompany,
                is_deleted=False
            )
        except Client.DoesNotExist:
            raise NotFound("Client not found")

    def get_queryset(self):
        return Client.objects.filter(
            company=self.request.user.usercompany,
            is_deleted=False
        ).prefetch_related("attachments", "identifiers")

    def get_serializer_class(self):
        if self.action == "list":
            return ClientListSerializer
        elif self.action == "retrieve":
            return ClientDetailSerializer
        return ClientCreateUpdateSerializer

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.usercompany)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])


    @action(detail=True, methods=["get", "post"])
    def identifiers(self, request, pk=None):
        client = self.get_client()

        if request.method == "GET":
            identifiers = client.identifiers.all()
            serializer = ClientIdentifierSerializer(identifiers, many=True)
            return Response(serializer.data)

        if request.method == "POST":
            serializer = ClientIdentifierSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(client=client)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="identifiers/(?P<identifier_id>[^/.]+)")
    def delete_identifier(self, request, pk=None, identifier_id=None):
        client = self.get_client()

        try:
            identifier = client.identifiers.get(id=identifier_id)
        except ClientIdentifier.DoesNotExist:
            raise NotFound("Identifier not found")

        identifier.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class EmployeeViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Employee.objects.filter(
            company=self.request.user.usercompany,
            is_deleted=False
        ).prefetch_related("attachments")

    def get_serializer_class(self):
        if self.action == "list":
            return EmployeeListSerializer
        elif self.action == "retrieve":
            return EmployeeDetailSerializer
        return EmployeeCreateUpdateSerializer

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.usercompany)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])

    def get_employee(self):
        try:
            return Employee.objects.get(
                id=self.kwargs.get("pk"),
                company=self.request.user.usercompany,
                is_deleted=False
            )
        except Employee.DoesNotExist:
            raise NotFound("Employee not found")

