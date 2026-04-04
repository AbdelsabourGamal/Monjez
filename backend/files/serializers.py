from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers
from accounts.models import UserCompany
from organizations.models import Company, Branch
from people.models import Client, Employee
from catalog.models import Product
from .models import File


# 🔹 READ
class FileReadSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    content_type = serializers.CharField(source="content_type.model", read_only=True)
    uploaded_by = serializers.UUIDField(source="uploaded_by_id", read_only=True)

    class Meta:
        model = File
        fields = [
            "id",
            "name",
            "file",
            "file_url",
            "file_type",
            "size",
            "content_type",
            "object_id",
            "uploaded_by",
            "created_at",
        ]

    def get_file_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


# 🔹 UPLOAD
class FileUploadSerializer(serializers.ModelSerializer):
    content_type = serializers.CharField(write_only=True)

    class Meta:
        model = File
        fields = [
            "file",
            "name",
            "content_type",
            "object_id",
        ]

    def validate(self, attrs):
        request = self.context["request"]

        allowed_models = {
            "usercompany": UserCompany,
            "company": Company,
            "branch": Branch,
            "client": Client,
            "employee": Employee,
            "product": Product,
        }

        model_name = attrs["content_type"].strip().lower()

        if model_name not in allowed_models:
            raise serializers.ValidationError("Unsupported attachment target.")

        model_class = allowed_models[model_name]

        try:
            target = model_class.objects.get(
                id=attrs["object_id"], is_deleted=False
            )
        except model_class.DoesNotExist:
            raise serializers.ValidationError(
                {"object_id": "Target object not found."}
            )

        # 🔐 Multi-tenancy check
        user_company = request.user.usercompany

        if hasattr(target, "company"):
            if target.company != user_company:
                raise serializers.ValidationError(
                    "You cannot attach files to another company data."
                )

        elif hasattr(target, "user_company"):
            if target.user_company != user_company:
                raise serializers.ValidationError(
                    "You cannot attach files to another company data."
                )

        attrs["content_type"] = ContentType.objects.get_for_model(model_class)
        attrs["content_object"] = target

        return attrs

    def create(self, validated_data):
        content_object = validated_data.pop("content_object")

        return File.objects.create(
            content_object=content_object,
            uploaded_by=self.context["request"].user,
            **validated_data,
        )