# organizations/models.py

from django.db import models
from django.contrib.contenttypes.fields import GenericRelation
from accounts.models import BaseModel, UserCompany


class Company(BaseModel):
    user_company = models.ForeignKey(
        UserCompany,
        on_delete=models.CASCADE,
        related_name="companies"
    )

    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=255, blank=True)
    address = models.CharField(max_length=255, blank=True)
    license = models.CharField(max_length=255, blank=True)
    logo = models.ImageField(upload_to="logos/", blank=True)

    attachments = GenericRelation("files.File", related_query_name="companies")

    class Meta(BaseModel.Meta):
        indexes = [
            models.Index(fields=["user_company"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return self.name


class Branch(BaseModel):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="branches"
    )

    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=255, blank=True)
    address = models.CharField(max_length=255, blank=True)
    license = models.CharField(max_length=255, blank=True)
    logo = models.ImageField(upload_to="logos/", blank=True)

    attachments = GenericRelation("files.File", related_query_name="branches")

    class Meta(BaseModel.Meta):
        indexes = [
            models.Index(fields=["company"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return self.name