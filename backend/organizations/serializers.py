from rest_framework import serializers
from .models import Company, Branch
from files.serializers import FileReadSerializer


# 🔹 Branch
class BranchSerializer(serializers.ModelSerializer):
    attachments = FileReadSerializer(many=True, read_only=True)

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "phone",
            "address",
            "license",
            "logo",
            "company",
            "attachments",
        ]
        read_only_fields = ["attachments"]


# 🔹 Company
class CompanySerializer(serializers.ModelSerializer):
    attachments = FileReadSerializer(many=True, read_only=True)
    branches = BranchSerializer(many=True, read_only=True)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "phone",
            "address",
            "license",
            "logo",
            "attachments",
            "branches",
        ]
        read_only_fields = ["attachments", "branches"]