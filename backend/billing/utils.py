import hmac
import hashlib
import requests
from django.conf import settings


def verify_myfatoorah_payment(id_value, key_type="invoiceid"):
    headers = {
        "Authorization": f"Bearer {settings.MYFATOORAH_API_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "Key": id_value,
        "KeyType": key_type
    }

    res = requests.post(
        f"{settings.MYFATOORAH_BASE_URL}/v2/GetPaymentStatus",
        json=payload,
        headers=headers,
        timeout=10
    )

    return res.json()


def verify_myfatoorah_signature(request):
    received_signature = request.headers.get("X-MyFatoorah-Signature")
    if not received_signature:
        return False

    secret = settings.MYFATOORAH_WEBHOOK_SECRET.encode()

    calculated_signature = hmac.new(
        secret,
        request.body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(calculated_signature, received_signature)

def get_payment_methods():
    headers = {
        "Authorization": f"Bearer {settings.MYFATOORAH_API_TOKEN}",
        "Content-Type": "application/json"
    }

    res = requests.post(
        f"{settings.MYFATOORAH_BASE_URL}/v2/InitiatePayment",
        json={"InvoiceAmount": 10, "CurrencyIso": "KWD"},
        headers=headers,
        timeout=10
    )

    return res.json()