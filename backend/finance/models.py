# finance/models.py
from django.db import models
from accounts.models import BaseModel

class Expense(BaseModel):
    company = models.ForeignKey('organizations.Company', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    date = models.DateField()
    currency = models.CharField(max_length=10)