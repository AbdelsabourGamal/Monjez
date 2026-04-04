from django.db import models
from accounts.models import User, BaseModel
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from django.db import transaction


# Create your models here.
class Plan(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    monthly_price = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    yearly_price = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    discount_percentage = models.PositiveIntegerField(default=0)
    daily_credits = models.PositiveIntegerField(default=0)
    monthly_credits = models.PositiveIntegerField(default=0)
    type = models.CharField(max_length=50, choices=[('free', 'Free'), ('paid', 'Paid')], default="paid")  # free / paid
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    def get_yearly_savings(self):
        if self.monthly_price > 0 and self.yearly_price > 0:
            monthly_total = self.monthly_price * 12
            savings = ((monthly_total - self.yearly_price) / monthly_total) * 100
            return round(savings)
        return 0
    
    def save(self, *args, **kwargs):
        if self.monthly_price == 0 and self.yearly_price == 0:
            self.type = 'free'
        else:
            self.type = 'paid'

        super().save(*args, **kwargs)

class UserSubscription(BaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True, blank=True)

    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_yearly = models.BooleanField(default=False)
    auto_renew = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.email} - {self.plan.name if self.plan else 'No Plan'}"

    # CORE LOGIC
    @transaction.atomic
    def activate_subscription(self, plan, is_yearly=False):
        """
        Activate / renew subscription safely
        """

        if not plan or not plan.is_active:
            raise ValueError("Invalid or inactive plan")

        now = timezone.now()

        # 🔁 Preserve remaining time (renew logic)
        if self.end_date and self.end_date > now:
            start_date = self.end_date
        else:
            start_date = now

        self.plan = plan
        self.is_yearly = is_yearly
        self.is_active = True
        self.start_date = start_date

        if is_yearly:
            self.end_date = start_date + relativedelta(years=1)
        else:
            self.end_date = start_date + relativedelta(months=1)

        self.save()

        # 🔄 Sync credits
        credit, _ = UserCredit.objects.get_or_create(user=self.user)
        credit.update_plan_credits(plan)

        return self

    # PLAN CHANGE
    @transaction.atomic
    def apply_plan_change(self, new_plan, is_yearly=False):
        """
        Handles:
        - Upgrade → immediate
        - Downgrade → after current period
        - New → immediate
        """

        if not new_plan or not new_plan.is_active:
            raise ValueError("Invalid or inactive plan")

        now = timezone.now()

        # 🟢 Upgrade → immediate
        if self.plan and new_plan.monthly_price > self.plan.monthly_price:
            return self.activate_subscription(new_plan, is_yearly)

        # 🟡 Downgrade → schedule after expiry
        if self.end_date and self.end_date > now:
            self.plan = new_plan
            self.is_yearly = is_yearly
            self.save(update_fields=["plan", "is_yearly"])
            return self

        # 🔵 New / expired
        return self.activate_subscription(new_plan, is_yearly)

    # STATUS CHECKS
    def is_expired(self):
        return bool(self.end_date and timezone.now() > self.end_date)

    def days_left(self):
        if not self.end_date:
            return None
        return max(0, (self.end_date - timezone.now()).days)

    def is_valid(self):
        return self.is_active and not self.is_expired()

    # SAFETY GUARD
    def ensure_valid_subscription(self):
        """
        Use before any paid feature
        """
        if not self.is_valid():
            self.downgrade_to_free()
            return False
        return True

    # FREE FALLBACK
    @transaction.atomic
    def downgrade_to_free(self):
        """
        Downgrade safely to free plan
        """

        try:
            free_plan = Plan.objects.get(type='free', is_active=True)
        except Plan.DoesNotExist:
            raise ValueError("Free plan is missing")

        self.plan = free_plan
        self.is_active = True
        self.is_yearly = False
        self.start_date = timezone.now()
        self.end_date = None

        self.save()

        credit, _ = UserCredit.objects.get_or_create(user=self.user)
        credit.update_plan_credits(free_plan)

        return self

class UserCredit(BaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='credit')

    # Plan limits
    daily_credits = models.PositiveIntegerField(default=0)
    monthly_credits = models.PositiveIntegerField(default=0)

    # Extra credits (affiliate, promo, manual)
    bonus = models.PositiveIntegerField(default=0)

    # Usage tracking
    daily_credits_used = models.PositiveIntegerField(default=0)
    monthly_credits_used = models.PositiveIntegerField(default=0)

    last_daily_reset = models.DateTimeField(auto_now_add=True)
    last_monthly_reset = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.full_name} credits"

    def reset_daily_if_needed(self):
        now = timezone.now()
        if now.date() > self.last_daily_reset.date():
            self.daily_credits_used = 0
            self.last_daily_reset = now
            self.save(update_fields=["daily_credits_used", "last_daily_reset"])

    def reset_monthly_if_needed(self):
        now = timezone.now()
        if now.month != self.last_monthly_reset.month or now.year != self.last_monthly_reset.year:
            self.monthly_credits_used = 0
            self.last_monthly_reset = now
            self.save(update_fields=["monthly_credits_used", "last_monthly_reset"])

    def remaining_daily(self):
        self.reset_daily_if_needed()
        return max(0, self.daily_credits - self.daily_credits_used)

    def remaining_monthly(self):
        self.reset_monthly_if_needed()
        return max(0, self.monthly_credits - self.monthly_credits_used)

    def remaining_total(self):
        """
        Total usable credits (plan + bonus)
        """
        return self.remaining_monthly() + self.bonus

    def can_use(self, amount=1):
        self.reset_daily_if_needed()
        self.reset_monthly_if_needed()

        if self.remaining_daily() < amount:
            return False

        monthly_left = self.remaining_monthly()

        if monthly_left >= amount:
            return True

        if monthly_left + self.bonus >= amount:
            return True

        return False

    def use(self, amount=1):
        """
        Priority:
        1) daily + monthly (plan)
        2) bonus (لو monthly خلص)
        """
        if not self.can_use(amount):
            return False

        self.reset_daily_if_needed()
        self.reset_monthly_if_needed()

        daily_left = self.remaining_daily()
        monthly_left = self.remaining_monthly()

        # 🔥 الحالة 1: monthly يكفي
        if monthly_left >= amount:
            consume = min(amount, daily_left, monthly_left)

            self.daily_credits_used += consume
            self.monthly_credits_used += consume

        else:
            # 🔥 الحالة 2: monthly خلص → استخدم bonus
            consume = min(amount, daily_left)

            self.daily_credits_used += consume
            # ❌ ما نزودش monthly_used

            self.bonus -= consume

        self.save()
        return True

    def update_plan_credits(self, plan):
        """
        Sync credit limits with plan
        """
        self.daily_credits = plan.daily_credits
        self.monthly_credits = plan.monthly_credits
        self.daily_credits_used = 0
        self.monthly_credits_used = 0
        self.save()

class Payment(BaseModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="KWD")

    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    is_yearly = models.BooleanField(default=False)

    provider = models.CharField(max_length=50)  # stripe / myfatoorah
    transaction_id = models.CharField(max_length=255, blank=True)

    external_invoice_id = models.CharField(max_length=100, blank=True, null=True)

    payment_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    expires_at = models.DateTimeField(null=True, blank=True)

    paid_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.email} - {self.amount} {self.currency}"

class Invoice(BaseModel):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name="invoice")
    invoice_number = models.CharField(max_length=50, unique=True)
    pdf = models.FileField(upload_to="invoices/", null=True, blank=True)

    def __str__(self):
        return self.invoice_number

