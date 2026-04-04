# accounts/models.py
import uuid
from django.contrib.contenttypes.fields import GenericRelation
from django.db import models, transaction
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from django.contrib.auth.models import AbstractUser

class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True
        ordering = ['-created_at']

class User(AbstractUser):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=255, blank=True)
    enable_2fa = models.BooleanField(default=False)
    token_version = models.IntegerField(default=0)
    last_password_change = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    username = None

class UserCompany(BaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='usercompany')
    name = models.CharField(max_length=255)
    industry = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=255, blank=True)
    address = models.CharField(max_length=255, blank=True)
    email = models.EmailField(unique=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='logos/', blank=True)
    attachments = GenericRelation("files.File", related_query_name="user_companies")

CURRENCY_CHOICES = [
    ('KWD', 'KWD'),
    ('SAR', 'SAR'),
    ('AED', 'AED'),
    ('USD', '$'),
    ('EUR', '€'),
    ('GBP', '£'),
    ('EGP', 'L.E.'),
    ('QAR', 'QAR'),
    ('BHD', 'BHD'),
    ('OMR', 'OMR'),
    ('JOD', 'JOD'),
]

class CompanySettings(BaseModel):
    company = models.OneToOneField(UserCompany, on_delete=models.CASCADE, related_name='settings')
    currency = models.CharField(max_length=10, choices=CURRENCY_CHOICES, default="KWD")
    tax_number = models.CharField(max_length=100, blank=True)
    default_language = models.CharField(max_length=10, choices=[('en', 'English'), ('ar', 'Arabic')], default="en")

    license = models.CharField(max_length=255, blank=True)
    country = models.CharField(max_length=255, blank=True)
    signatory_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=255, blank=True)
    national_id = models.CharField(max_length=255, blank=True)
    Nationality = models.CharField(max_length=255, blank=True)
    passport_number = models.CharField(max_length=255, blank=True)
    signature = models.ImageField(upload_to='signatures/', blank=True)

class BankAccount(BaseModel):
    company = models.OneToOneField(UserCompany, on_delete=models.CASCADE, related_name='bank_accounts')
    name = models.CharField(max_length=255)
    iban = models.CharField(max_length=100)
    swift_code = models.CharField(max_length=50, blank=True)
    account_number = models.CharField(max_length=100, blank=True)

class OTP(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)

    purpose = models.CharField(max_length=20)  # login / verify

    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    def is_valid(self):
        from django.utils import timezone
        return not self.is_used and self.expires_at > timezone.now()

class AccessToken(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tokens")

    device_name = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.device_name}"
