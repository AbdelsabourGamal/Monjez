# services/models.py
from django.db import models
from accounts.models import BaseModel
from accounts.models import User

class LegalTask(BaseModel):
    company = models.ForeignKey('organizations.Company', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=50)
    due_date = models.DateField()
    assigned_to = models.CharField(max_length=255)

class ComplianceReport(BaseModel):
    company = models.ForeignKey('organizations.Company', on_delete=models.CASCADE)
    type = models.CharField(max_length=50)
    score = models.FloatField()
    result = models.JSONField()


# Qanoon AI
class ChatSession(BaseModel):
    # company = models.ForeignKey('organizations.Company', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    is_favorite = models.BooleanField(default=False)
    is_incognito = models.BooleanField(default=False)

# Qanoon AI
class ChatMessage(BaseModel):
    ROLE_CHOICES = (
        ('user', 'User'),
        ('assistant', 'Assistant'),
    )

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()

    class Meta(BaseModel.Meta):
        db_table = "chat_messages"

class AIJob(BaseModel):
    company = models.ForeignKey('organizations.Company', on_delete=models.CASCADE)
    type = models.CharField(max_length=100)
    input_data = models.JSONField()
    output_data = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=50)


class Integration(BaseModel):
    company = models.ForeignKey('organizations.Company', on_delete=models.CASCADE)
    type = models.CharField(max_length=50)
    config = models.JSONField()
    active = models.BooleanField(default=True)

class ActivityLog(BaseModel):
    company = models.ForeignKey('organizations.Company', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=100)
    entity_id = models.UUIDField()
    metadata = models.JSONField(default=dict)