from rest_framework import serializers
from files.serializers import FileReadSerializer

from .models import Client, ClientIdentifier, Employee

class ClientListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "name", "email", "phone"]

class ClientIdentifierSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientIdentifier
        fields = ["id", "type", "value"]


class ClientDetailSerializer(serializers.ModelSerializer):
    identifiers = ClientIdentifierSerializer(many=True, read_only=True)
    attachments = FileReadSerializer(many=True, read_only=True)

    class Meta:
        model = Client
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "address",
            "notes",
            "currency",
            "identifiers",
            "attachments",
        ]

class ClientCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            "name",
            "email",
            "phone",
            "address",
            "notes",
            "currency",
        ]

    def validate_email(self, value):
        if value and Client.objects.filter(
            email=value,
            company=self.context["request"].user.usercompany,
            is_deleted=False
        ).exists():
            raise serializers.ValidationError("Client with this email already exists")
        return value

class EmployeeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ["id", "name", "job_title", "email", "phone"]

class EmployeeDetailSerializer(serializers.ModelSerializer):
    attachments = FileReadSerializer(many=True, read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "name",
            "job_title",
            "civil_id",
            "email",
            "phone",
            "salary",
            "currency",
            "join_date",
            "attachments",
        ]

class EmployeeCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = [
            "name",
            "job_title",
            "civil_id",
            "email",
            "phone",
            "salary",
            "currency",
            "join_date",
        ]

    def validate_civil_id(self, value):
        if Employee.objects.filter(
            civil_id=value,
            company=self.context["request"].user.usercompany,
            is_deleted=False
        ).exists():
            raise serializers.ValidationError("Employee with this ID already exists")
        return value
