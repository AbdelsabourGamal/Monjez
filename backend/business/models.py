# business/models.py
from django.db import models
from accounts.models import BaseModel

class Quote(BaseModel):
    company = models.ForeignKey('organizations.Company', on_delete=models.CASCADE)
    client = models.ForeignKey('people.Client', on_delete=models.CASCADE)
    status = models.CharField(max_length=50)
    issue_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    is_invoice = models.BooleanField(default=False)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=50)
    viewed_at = models.DateTimeField(null=True, blank=True)

class QuoteItem(BaseModel):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey('catalog.Product', null=True, on_delete=models.SET_NULL)
    description = models.TextField()
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)


class ContractTemplate(BaseModel):
    name = models.CharField(max_length=255)
    content = models.JSONField()

class Contract(BaseModel):
    company = models.ForeignKey('organizations.Company', on_delete=models.CASCADE)
    client = models.ForeignKey('people.Client', on_delete=models.CASCADE)
    template = models.ForeignKey(ContractTemplate, on_delete=models.SET_NULL, null=True)
    variables = models.JSONField()
    jurisdiction = models.CharField(max_length=100)
    status = models.CharField(max_length=50)

class ContractClause(BaseModel):
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    content = models.TextField()

class TimeEntry(BaseModel):
    client = models.ForeignKey('people.Client', on_delete=models.CASCADE)
    description = models.TextField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration_seconds = models.IntegerField()
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50)




class RecurringProfile(BaseModel):
    company = models.ForeignKey('organizations.Company', on_delete=models.CASCADE)
    client = models.ForeignKey('people.Client', on_delete=models.CASCADE)
    frequency = models.CharField(max_length=50)
    next_due_date = models.DateField()
    template_data = models.JSONField()
    active = models.BooleanField(default=True)

class RecurringLog(BaseModel):
    recurring = models.ForeignKey(RecurringProfile, on_delete=models.CASCADE)
    generated_quote = models.ForeignKey('business.Quote', on_delete=models.SET_NULL, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)