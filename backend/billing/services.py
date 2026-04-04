from django.utils import timezone
from django.db import transaction
from .models import UserSubscription, Plan, Payment
from datetime import timedelta
import uuid
import io
from django.utils import timezone, translation
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from django.db import transaction

from xhtml2pdf import pisa

from .models import Payment, Invoice, Plan, UserSubscription

def get_or_create_subscription(user):
    subscription, _ = UserSubscription.objects.get_or_create(
        user=user,
        defaults={
            "start_date": timezone.now(),
            "is_active": True,
        }
    )
    return subscription


def generate_invoice_number():
    date_part = timezone.now().strftime("%Y%m%d")
    random_part = uuid.uuid4().hex[:6].upper()
    return f"INV-{date_part}-{random_part}"

def generate_invoice_pdf(payment):
    invoice_number = generate_invoice_number()

    html = render_to_string(
        "invoice.html",
        {
            "payment": payment,
            "invoice_number": invoice_number,
            "date": timezone.now().strftime("%Y-%m-%d"),
            "LANG": translation.get_language(),
        }
    )

    pdf = io.BytesIO()
    pisa.CreatePDF(io.BytesIO(html.encode("UTF-8")), pdf)

    invoice = Invoice.objects.create(
        payment=payment,
        invoice_number=invoice_number
    )

    invoice.pdf.save(
        f"{invoice_number}.pdf",
        ContentFile(pdf.getvalue())
    )

    return invoice

@transaction.atomic
def mark_payment_as_paid(payment):
    payment = Payment.objects.select_for_update().get(id=payment.id)

    if payment.payment_status == "paid":
        return False

    payment.payment_status = "paid"
    payment.paid_at = timezone.now()
    payment.save(update_fields=["payment_status", "paid_at"])

    subscription, _ = UserSubscription.objects.get_or_create(
        user=payment.user
    )

    subscription.apply_plan_change(
        payment.plan,
        is_yearly=payment.is_yearly
    )

    invoice, created = Invoice.objects.get_or_create(
        payment=payment,
        defaults={"invoice_number": generate_invoice_number()}
    )

    if created:
        generate_invoice_pdf(payment)

    return True

def select_plan(user, plan_id, is_yearly=False):
    plan = Plan.objects.filter(id=plan_id, is_active=True).first()

    if not plan:
        raise ValueError("Invalid plan")

    subscription, _ = UserSubscription.objects.get_or_create(user=user)

    # نفس الباقة
    if subscription.plan == plan and subscription.is_valid():
        raise ValueError("Already subscribed")

    # 🟢 Free
    if plan.type == "free":
        subscription.activate_subscription(plan, is_yearly)
        return {"type": "free"}

    # 💳 Paid → create payment
    amount = plan.yearly_price if is_yearly else plan.monthly_price

    payment = Payment.objects.create(
        user=user,
        plan=plan,
        amount=amount,
        is_yearly=is_yearly,
        provider="myfatoorah",
        payment_status="pending",
        expires_at=timezone.now() + timedelta(minutes=30)
    )

    return {
        "type": "paid",
        "payment_id": payment.id
    }

