# accounts/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import (
    User,
    UserCompany,
    CompanySettings,
    BankAccount
)

@receiver(post_save, sender=User)
def create_user_company(sender, instance, created, **kwargs):
    if not created:
        return

    if hasattr(instance, "usercompany"):
        return

    company = UserCompany.objects.create(
        user=instance,
        name=instance.full_name or instance.email,
        email=instance.email,
    )

    CompanySettings.objects.create(company=company)
    BankAccount.objects.create(company=company)