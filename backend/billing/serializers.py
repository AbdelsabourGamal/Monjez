from rest_framework import serializers
from .models import Plan, Payment

class SubscriptionSerializer(serializers.Serializer):
    plan = serializers.CharField()
    status = serializers.CharField()
    is_yearly = serializers.BooleanField()
    end_date = serializers.DateTimeField()
    days_left = serializers.IntegerField()
    credits = serializers.DictField()

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            "id",
            "name",
            "description",
            "type",
            "monthly_price",
            "yearly_price",
            "daily_credits",
            "monthly_credits",
        ]


class SelectPlanSerializer(serializers.Serializer):
    plan_id = serializers.UUIDField()
    is_yearly = serializers.BooleanField(default=False)


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "amount", "currency", "payment_status"]