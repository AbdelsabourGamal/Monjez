from django.contrib import admin
from .models import UserCredit, UserSubscription, Plan, Payment, Invoice

# Register your models here.
admin.site.register(UserCredit)
admin.site.register(UserSubscription)
admin.site.register(Plan)
admin.site.register(Payment)
admin.site.register(Invoice)