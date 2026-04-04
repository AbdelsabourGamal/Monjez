# people/models.py
from django.db import models
from django.contrib.contenttypes.fields import GenericRelation
from accounts.models import BaseModel, UserCompany

class Client(BaseModel):
    company = models.ForeignKey(UserCompany, on_delete=models.CASCADE, related_name="clients")
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    currency = models.CharField(max_length=10, blank=True, null=True)
    attachments = GenericRelation("files.File", related_query_name="clients")

    class Meta(BaseModel.Meta):
        indexes = [
            models.Index(fields=["company", "name"]),
            models.Index(fields=["company", "email"]),
        ]
class ClientIdentifier(BaseModel):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='identifiers')
    type = models.CharField(max_length=50)
    value = models.CharField(max_length=255)

class Employee(BaseModel):
    company = models.ForeignKey(UserCompany, on_delete=models.CASCADE, related_name="employees")
    name = models.CharField(max_length=255)
    job_title = models.CharField(max_length=100, blank=True)
    civil_id = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, blank=True, null=True)
    join_date = models.DateField()
    attachments = GenericRelation("files.File", related_query_name="employees")

    class Meta:
        indexes = [
            models.Index(fields=["company", "name"]),
            models.Index(fields=["company", "civil_id"]),
        ]

