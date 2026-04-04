from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.translation import gettext as _
from rest_framework import serializers
from stdnum import iban
from files.serializers import FileReadSerializer

from .models import User, CompanySettings, UserCompany, BankAccount

from .utils.email import send_password_reset_email

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "phone"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["email", "password", "full_name", "phone"]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        return user

class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, data):
        user = User.objects.filter(email=data["email"]).first()

        if not user:
            raise serializers.ValidationError("User not found")

        if user.is_active:
            raise serializers.ValidationError("Account already verified")

        data["user"] = user
        return data

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            email=data["email"],
            password=data["password"],
        )

        if not user:
            raise serializers.ValidationError("Invalid credentials")

        if not user.is_active:
            raise serializers.ValidationError("User is inactive")

        data["user"] = user
        return data

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)
    confirm_new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = self.instance

        if not user.check_password(data["old_password"]):
            raise serializers.ValidationError({
                "old_password": _("Old password is incorrect")
            })

        if data["new_password"] != data["confirm_new_password"]:
            raise serializers.ValidationError({
                "confirm_new_password": _("Passwords do not match")
            })

        if data["old_password"] == data["new_password"]:
            raise serializers.ValidationError({
                "new_password": _("New password must be different from old password")
            })

        validate_password(data["new_password"], user)

        return data

    def update(self, instance, validated_data):
        instance.set_password(validated_data["new_password"])
        instance.save()
        return instance

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, data):
        return data

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def send_reset_email(self):
        user = User.objects.filter(
            email__iexact=self.validated_data["email"]
        ).first()

        if not user:
            return

        token = PasswordResetTokenGenerator().make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.id))
        params = urlencode({"uid": uid, "token": token})

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        reset_url = f"{frontend_url}/reset-password?{params}"

        print("RESET URL:", reset_url)

        send_password_reset_email(user, reset_url)


    
class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=6)

    def validate(self, data):
        try:
            user_id = urlsafe_base64_decode(data["uid"]).decode()
            user = User.objects.get(id=user_id)
        except Exception:
            raise serializers.ValidationError("Invalid UID")

        if not PasswordResetTokenGenerator().check_token(user, data["token"]):
            raise serializers.ValidationError("Invalid or expired token")

        validate_password(data["new_password"], user)

        data["user"] = user
        return data

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


class CompanySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySettings
        fields = [
            "currency",
            "tax_number",
            "default_language",
            "license",
            "country",
            "signatory_name",
            "role",
            "national_id",
            "Nationality",
            "passport_number",
            "signature",
        ]

class CompanySettingsWithAttachmentsSerializer(serializers.ModelSerializer):
    attachments = FileReadSerializer(
        source="company.attachments",
        many=True,
        read_only=True
    )

    class Meta:
        model = CompanySettings
        fields = [
            "currency",
            "tax_number",
            "default_language",
            "license",
            "country",
            "signatory_name",
            "role",
            "national_id",
            "Nationality",
            "passport_number",
            "signature",
            "attachments",
        ]


class CompanySerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = UserCompany
        fields = [
            "name",
            "industry",
            "phone",
            "address",
            "email",
            "website",
            "logo",
            "logo_url",
        ]
        read_only_fields = ["logo_url"]

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if obj.logo and request:
            return request.build_absolute_uri(obj.logo.url)
        return None

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError(_("Email is required"))
        return value

class BankAccountSerializer(serializers.ModelSerializer):

    class Meta:
        model = BankAccount
        fields = [
            "name",
            "iban",
            "swift_code",
            "account_number",
        ]

    def validate_iban(self, value):
        if not iban.is_valid(value):
            raise serializers.ValidationError(_("Invalid IBAN"))
        return value

    def validate(self, data):
        if not data.get("name"):
            raise serializers.ValidationError({
                "name": _("Bank name is required")
            })
        return data

