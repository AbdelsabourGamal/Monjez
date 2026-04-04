import requests

from django.conf import settings
from django.utils import timezone
from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .tasks import handle_successful_payment
from .models import Plan, Payment
from .serializers import PlanSerializer, SelectPlanSerializer
from .services import (
    select_plan,
    mark_payment_as_paid,
    get_or_create_subscription,
)
from .utils import (
    verify_myfatoorah_payment,
    verify_myfatoorah_signature,
)

class PlanViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        plans = Plan.objects.filter(is_active=True).order_by("monthly_price")
        return Response(PlanSerializer(plans, many=True).data)

class SubscriptionViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def me(self, request):
        sub = get_or_create_subscription(request.user)
        credit = getattr(request.user, "credit", None)

        return Response({
            "plan": sub.plan.name if sub.plan else None,
            "status": "active" if sub.is_valid() else "expired",
            "is_yearly": sub.is_yearly,
            "end_date": sub.end_date,
            "days_left": sub.days_left(),
            "auto_renew": sub.auto_renew,
            "credits": {
                "daily_remaining": credit.remaining_daily() if credit else 0,
                "monthly_remaining": credit.remaining_monthly() if credit else 0,
            }
        })

    @action(detail=False, methods=["post"], url_path="select")
    def select(self, request):

        serializer = SelectPlanSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        plan_id = serializer.validated_data["plan_id"]
        is_yearly = serializer.validated_data.get("is_yearly", False)
        try:
            result = select_plan(request.user, plan_id, is_yearly)

            # 🟢 Free plan
            if result["type"] == "free":
                return Response({
                    "message": "Subscription activated",
                    "status": "active"
                })

            # 💳 Paid → create MyFatoorah payment
            payment = Payment.objects.get(id=result["payment_id"])
            print("SELECT HIT")
            print(request.data)

            payload = {
                "InvoiceValue": float(payment.amount),
                "CustomerName": request.user.full_name or "User",
                "CustomerEmail": request.user.email or "test@test.com",
                "DisplayCurrencyIso": payment.currency,
                "PaymentMethodId": 1,  # 🔥 غيرها من 2 → 1
                "CallbackUrl": settings.MYFATOORAH_CALLBACK_URL,
                "ErrorUrl": settings.MYFATOORAH_ERROR_URL,
            }

            headers = {
                "Authorization": f"Bearer {settings.MYFATOORAH_API_TOKEN}",
                "Content-Type": "application/json"
            }

            res = requests.post(
                f"{settings.MYFATOORAH_BASE_URL}/v2/ExecutePayment",
                json=payload,
                headers=headers,
                timeout=10
            )

            data = res.json()
            print("MYFATOORAH RESPONSE:", data)

            if not data.get("IsSuccess"):
                return Response(
                    {"error": data.get("Message")},
                    status=400
                )

            # 🔥 save external invoice id
            payment.external_invoice_id = data["Data"]["InvoiceId"]
            payment.save(update_fields=["external_invoice_id"])

            return Response({
                "payment_id": payment.id,
                "payment_url": data["Data"]["PaymentURL"]
            })

        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=["post"])
    def cancel(self, request):
        sub = get_or_create_subscription(request.user)

        sub.auto_renew = False
        sub.save(update_fields=["auto_renew"])

        return Response({
            "message": "Subscription will not renew at period end"
        })


class PaymentViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def mock_pay(self, request):
        payment_id = request.data.get("payment_id")

        payment = Payment.objects.filter(
            id=payment_id,
            user=request.user
        ).first()

        if not payment:
            return Response({"error": "Invalid payment"}, status=404)

        if payment.payment_status == "paid":
            return Response({"message": "Already paid"})

        # 🔥 Use service (مش direct logic)
        handle_successful_payment.delay(payment.id)

        return Response({
            "message": "Payment successful, subscription activated"
        })

    @action(detail=False, methods=["get"])
    def success(self, request):
        invoice_id = request.GET.get("invoiceId")

        payment = Payment.objects.filter(
            external_invoice_id=invoice_id,
            user=request.user
        ).first()

        if not payment:
            return Response({"error": "Payment not found"}, status=404)

        # 🔥 هنا المكان الصح
        if payment.expires_at and payment.expires_at < timezone.now():
            return Response({"error": "Payment expired"}, status=400)

        result = verify_myfatoorah_payment(invoice_id)

        if not result.get("IsSuccess"):
            return Response({"error": "Verification failed"}, status=400)

        if result["Data"]["InvoiceStatus"] != "Paid":
            return Response({"status": "pending"})

        activated = mark_payment_as_paid(payment)

        return Response({
            "status": "paid",
            "activated": activated
        })
    
class PaymentWebhookViewSet(ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"])
    def myfatoorah(self, request):
        # 🔐 verify signature
        if not verify_myfatoorah_signature(request):
            return Response({"detail": "Invalid signature"}, status=403)

        invoice_id = request.data.get("InvoiceId")

        if not invoice_id:
            return Response(status=200)

        payment = Payment.objects.filter(
            external_invoice_id=invoice_id
        ).first()

        if not payment:
            return Response(status=200)

        result = verify_myfatoorah_payment(invoice_id)

        if not result.get("IsSuccess"):
            return Response(status=200)

        if result["Data"]["InvoiceStatus"] != "Paid":
            return Response(status=200)

        handle_successful_payment.delay(payment.id)

        return Response(status=200)

