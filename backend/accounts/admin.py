from django.contrib import admin
from .models import User, UserCompany, CompanySettings, BankAccount, OTP


# Register your models here.
admin.site.register(User)
admin.site.register(UserCompany)
admin.site.register(CompanySettings)
admin.site.register(BankAccount)
admin.site.register(OTP)
