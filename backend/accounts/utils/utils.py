from django.conf import settings
from django.core import signing
from django.core.signing import BadSignature, SignatureExpired
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken


def blacklist_user_tokens(user):
    tokens = OutstandingToken.objects.filter(user=user)

    for token in tokens:
        BlacklistedToken.objects.get_or_create(token=token)

def build_refresh_token(user, session):
    refresh = RefreshToken.for_user(user)

    refresh["token_version"] = user.token_version
    refresh["session_id"] = str(session.id)

    company = getattr(user, "usercompany", None)
    if company:
        refresh["company_id"] = str(company.id)

    return refresh

def make_email_verification_token(user):
    return signing.dumps(
        {"uid": str(user.pk), "purpose": "email_verification"},
        salt="accounts.email_verification",
    )


def verify_email_token(token):
    max_age = getattr(settings, "EMAIL_VERIFICATION_TOKEN_MAX_AGE", 60 * 60 * 24)

    try:
        payload = signing.loads(
            token,
            salt="accounts.email_verification",
            max_age=max_age,
        )
    except (BadSignature, SignatureExpired) as exc:
        raise ValueError("Invalid or expired token") from exc

    if payload.get("purpose") != "email_verification":
        raise ValueError("Invalid or expired token")

    return payload["uid"]

def validate_iban(self, value):
    if not iban.is_valid(value):
        raise serializers.ValidationError(_("Invalid IBAN"))
    return value