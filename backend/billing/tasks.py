from celery import shared_task
from django.utils import timezone
from .models import UserSubscription, Payment

from .services import mark_payment_as_paid, generate_invoice_pdf
from accounts.utils.email import send_invoice_email


@shared_task
def process_auto_renew():
    now = timezone.now()

    subscriptions = UserSubscription.objects.filter(
        auto_renew=True,
        end_date__lte=now,
        is_active=True
    )

    for sub in subscriptions:
        plan = sub.plan

        if not plan or plan.type == "free":
            continue

        amount = plan.yearly_price if sub.is_yearly else plan.monthly_price

        # 🧾 create payment
        Payment.objects.create(
            user=sub.user,
            plan=plan,
            amount=amount,
            is_yearly=sub.is_yearly,
            provider="myfatoorah",
            payment_status="pending"
        )

@shared_task
def expire_pending_payments():
    now = timezone.now()

    payments = Payment.objects.filter(
        payment_status="pending",
        expires_at__lte=now
    )

    for payment in payments:
        payment.payment_status = "failed"
        payment.failed_at = now
        payment.save(update_fields=["payment_status", "failed_at"])


@shared_task
def handle_successful_payment(payment_id):
    payment = Payment.objects.get(id=payment_id)

    # 🔄 activate
    activated = mark_payment_as_paid(payment)

    if not activated:
        return

    # 🧾 generate invoice
    invoice = payment.invoice  # already created

    # 📧 send email
    send_invoice_email(payment, invoice)