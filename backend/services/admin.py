from django.contrib import admin
from .models import LegalTask, ComplianceReport, ChatSession, ChatMessage, AIJob, Integration, ActivityLog

# Register your models here.
admin.site.register(LegalTask)
admin.site.register(ComplianceReport)
admin.site.register(ChatSession)
admin.site.register(ChatMessage)
admin.site.register(AIJob)
admin.site.register(Integration)
admin.site.register(ActivityLog)