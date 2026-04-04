import os

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models

from accounts.models import BaseModel, User


def resolve_user_company(instance):
    current = instance
    visited = set()

    while current is not None and id(current) not in visited:
        visited.add(id(current))

        if current.__class__.__name__ == "UserCompany":
            return current

        if hasattr(current, "user_company_id"):
            return current.user_company

        if hasattr(current, "company_id"):
            current = current.company
            continue

        return None

    return None


def upload_to(instance, filename):
    model_name = instance.content_type.model if instance.content_type_id else "file"
    safe_name = os.path.basename(filename)
    return f"uploads/{model_name}/{safe_name}"


class File(BaseModel):
    file = models.FileField(upload_to=upload_to)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey("content_type", "object_id")

    name = models.CharField(max_length=255, blank=True)
    file_type = models.CharField(max_length=50, blank=True)
    size = models.PositiveIntegerField(null=True, blank=True)

    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self):
        return self.name or self.file.name

    def save(self, *args, **kwargs):
        if self.file:
            self.name = self.name or os.path.basename(self.file.name)
            self.file_type = self.file_type or getattr(self.file, "content_type", "")
            self.size = self.file.size
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        if not self.content_object or not self.uploaded_by:
            return

        target_company = resolve_user_company(self.content_object)
        uploader_company = getattr(self.uploaded_by, "usercompany", None)

        if target_company is None:
            raise ValidationError("Files can only be attached to tenant-owned objects.")

        if uploader_company != target_company:
            raise ValidationError("You cannot attach files to another company data.")
