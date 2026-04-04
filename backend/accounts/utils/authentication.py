from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from accounts.models import AccessToken


class CustomJWTAuthentication(JWTAuthentication):

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        # 🔥 token_version check
        if validated_token.get("token_version") != user.token_version:
            raise AuthenticationFailed("Token expired")

        # 🔥 session check
        session_id = validated_token.get("session_id")

        if not session_id:
            raise AuthenticationFailed("Invalid session")


        session = AccessToken.objects.filter(
            id=session_id,
            user=user,
            is_active=True
        ).first()

        if not session:
            raise AuthenticationFailed("Session expired")

        return user