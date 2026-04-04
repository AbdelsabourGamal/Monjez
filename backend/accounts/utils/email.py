from django.conf import settings
from django.core.mail import send_mail
from django.utils.translation import gettext as _

def send_verification_email(user, verify_url):
    subject = _("Verify your account")
    message = _("Click the link below to verify your account:\n") + verify_url
    print(verify_url)

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user, reset_url):
    subject = _("Reset your password")
    message = _("Click the link below to reset your password:\n") + reset_url
    print(reset_url)
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

def send_otp_email(user, code):
    subject = _("Your verification code")
    message = _("Your OTP code is: ") + code

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

def send_invoice_email(payment, invoice):
    user = payment.user

    send_mail(
        subject="Invoice",
        message="Your payment was successful",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True
    )