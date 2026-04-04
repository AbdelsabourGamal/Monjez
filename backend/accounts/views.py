import os
import random
from datetime import timedelta
from urllib.parse import urlencode

from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.translation import gettext as _
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet
from rest_framework_simplejwt.tokens import RefreshToken

from .models import OTP, User, UserCompany, AccessToken, BankAccount
from .serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    CompanySettingsSerializer,
    CompanySettingsWithAttachmentsSerializer,
    CompanySerializer,
    BankAccountSerializer,
)
from .utils.email import send_otp_email, send_verification_email
from .utils.utils import (
    blacklist_user_tokens,
    build_refresh_token,
    make_email_verification_token,
    verify_email_token,
)


class AuthViewSet(ViewSet):

    def get_permissions(self):
        if self.action in [
            "register",
            "login",
            "verify_login",
            "resend_verification",
            "verify_account",
            "forgot_password",
            "reset_password",
        ]:
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=["post"])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        user.is_active = False
        user.save()

        UserCompany.objects.create(
            user=user,
            name=user.full_name or "My Company",
            email=user.email,
        )

        verification_token = make_email_verification_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        params = urlencode({
            "uid": uid,
            "token": verification_token,
        })

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        verify_url = f"{frontend_url}/verify_account?{params}"

        send_verification_email(user, verify_url)

        return Response(
            {"message": _("Verification email sent")},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"])
    def resend_verification(self, request):
        email = request.data.get("email")

        user = User.objects.filter(email=email).first()

        if not user:
            return Response({"error": _("User not found")}, status=404)

        if user.is_active:
            return Response({"error": _("Account already verified")}, status=400)

        verification_token = make_email_verification_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        params = urlencode({
            "uid": uid,
            "token": verification_token,
        })

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        verify_url = f"{frontend_url}/verify_account?{params}"

        send_verification_email(user, verify_url)

        return Response({"message": _("Verification email sent")})

    @action(detail=False, methods=["get"])
    def verify_account(self, request):
        uid = request.query_params.get("uid")
        token = request.query_params.get("token")

        if not uid or not token:
            return Response({"error": _("Invalid link")}, status=400)

        try:
            user_pk = urlsafe_base64_decode(uid).decode()
            signed_user_id = verify_email_token(token)

            if user_pk != signed_user_id:
                raise ValueError("UID mismatch")

            user = User.objects.get(id=user_pk)
        except Exception:
            return Response({"error": _("Invalid or expired token")}, status=400)

        if user.is_active:
            return Response({"error": _("Account already verified")}, status=400)

        user.is_active = True
        user.save()

        token = AccessToken.objects.create(
            user=user,
            device_name=request.headers.get("User-Agent", "")[:255],
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.headers.get("User-Agent", ""),
        )

        refresh = build_refresh_token(user, token)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })

    @action(detail=False, methods=["post"])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        if not user.is_active:
            return Response(
                {"error": _("Account not verified")},
                status=403,
            )

        if user.enable_2fa:
            code = str(random.randint(100000, 999999))

            OTP.objects.create(
                user=user,
                code=code,
                purpose="login",
                expires_at=timezone.now() + timedelta(minutes=5),
            )

            send_otp_email(user, code)

            return Response({
                "requires_2fa": True,
                "message": _("OTP sent"),
            })

        token = AccessToken.objects.create(
            user=user,
            device_name=request.headers.get("User-Agent", "")[:255],
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.headers.get("User-Agent", ""),
        )

        refresh = build_refresh_token(user, token)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })

    @action(detail=False, methods=["post"])
    def verify_login(self, request):
        email = request.data.get("email")
        code = request.data.get("code")

        user = User.objects.filter(email=email).first()

        if not user:
            return Response({"error": _("User not found")}, status=404)

        if not user.is_active:
            return Response({"error": _("Account not verified")}, status=403)

        with transaction.atomic():
            otp = (
                OTP.objects.select_for_update()
                .filter(
                    user=user,
                    code=code,
                    purpose="login",
                    is_used=False,
                )
                .order_by("-created_at")
                .first()
            )

            if not otp or not otp.is_valid():
                return Response(
                    {"error": _("Invalid or expired code")},
                    status=400,
                )

            otp.is_used = True
            otp.save(update_fields=["is_used"])

        token = AccessToken.objects.create(
            user=user,
            device_name=request.headers.get("User-Agent", "")[:255],
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.headers.get("User-Agent", ""),
        )

        refresh = build_refresh_token(user, token)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })

    @action(detail=False, methods=["get"])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=["post"])
    def logout(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()

            token_id = token.get("token_id")
            AccessToken.objects.filter(
                id=token_id,
                user=request.user,
            ).update(is_active=False)

            return Response({"message": _("Logged out successfully")})
        except Exception:
            return Response({"error": _("Invalid token")}, status=400)

    @action(detail=False, methods=["post"])
    def logout_all(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()

            request.user.token_version += 1
            request.user.save()

            AccessToken.objects.filter(user=request.user).update(is_active=False)
            blacklist_user_tokens(request.user)

            return Response({"message": _("Logged out successfully")})
        except Exception:
            return Response({"error": _("Invalid token")}, status=400)

    @action(detail=False, methods=["get"])
    def tokens(self, request):
        tokens = request.user.tokens.filter(is_active=True)

        data = [
            {
                "id": str(token.id),
                "device": token.device_name,
                "ip": token.ip_address,
                "last_seen": token.last_seen,
            }
            for token in tokens
        ]

        return Response(data)

    @action(detail=False, methods=["post"])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(
            instance=request.user,
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        request.user.token_version += 1
        request.user.save(update_fields=["password", "token_version"])

        blacklist_user_tokens(request.user)

        return Response({"message": _("Password updated successfully")})

    @action(detail=False, methods=["post"])
    def forgot_password(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.send_reset_email()

        return Response({
            "message": _("A reset password link has been sent.")
        })

    @action(detail=False, methods=["post"])
    def reset_password(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        user.token_version += 1
        user.save(update_fields=["password", "token_version"])

        blacklist_user_tokens(user)

        return Response({"message": _("Password reset successful")})


class CompanySettingsViewSet(ViewSet):

    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = CompanySettingsWithAttachmentsSerializer(
            request.user.usercompany.settings,
            context={"request": request},
        )
        return Response(serializer.data)

    @action(detail=False, methods=["put"])
    def update_me(self, request):
        settings = request.user.usercompany.settings

        serializer = CompanySettingsSerializer(
            settings,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "message": _("Settings updated successfully"),
            "data": serializer.data,
        })


class CompanyViewSet(ViewSet):

    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = CompanySerializer(
            request.user.usercompany,
            context={"request": request},
        )
        return Response(serializer.data)

    @action(detail=False, methods=["put"])
    def update_me(self, request):
        serializer = CompanySerializer(
            request.user.usercompany,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "message": _("Company profile updated successfully"),
            "data": serializer.data,
        })


class BankAccountViewSet(ViewSet):

    @action(detail=False, methods=["get"])
    def me(self, request):
        bank = getattr(request.user.usercompany, "bank_accounts", None)

        if not bank:
            return Response({
                "message": _("No bank account found"),
                "data": None,
            })

        serializer = BankAccountSerializer(bank)
        return Response(serializer.data)

    @action(detail=False, methods=["put"])
    def update_me(self, request):
        bank, created = BankAccount.objects.get_or_create(company=request.user.usercompany)

        serializer = BankAccountSerializer(
            bank,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "message": _("Bank account updated successfully"),
            "data": serializer.data,
        }, status=status.HTTP_200_OK)
