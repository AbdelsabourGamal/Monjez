from django.contrib import admin
from .models import Quote, QuoteItem, ContractTemplate, Contract, ContractClause, TimeEntry, RecurringProfile, RecurringLog

# Register your models here.
admin.site.register(Quote)
admin.site.register(QuoteItem)
admin.site.register(ContractTemplate)
admin.site.register(Contract)
admin.site.register(ContractClause)
admin.site.register(TimeEntry)
admin.site.register(RecurringProfile)
admin.site.register(RecurringLog)