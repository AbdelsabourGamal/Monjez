from django.contrib import admin
from .models import Client, ClientIdentifier, Employee

# Register your models here.
admin.site.register(Client)
admin.site.register(ClientIdentifier)
admin.site.register(Employee)
