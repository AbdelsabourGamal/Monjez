# catalog/models.py

from django.db import models
from django.contrib.contenttypes.fields import GenericRelation
from django.core.exceptions import ValidationError
from accounts.models import BaseModel, CURRENCY_CHOICES


class Product(BaseModel):
    PRODUCT = 'product'
    SERVICE = 'service'

    TYPE_CHOICES = [
        (PRODUCT, 'Product'),
        (SERVICE, 'Service'),
    ]

    company = models.ForeignKey('organizations.Company', on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    is_active = models.BooleanField(default=True)
    attachments = GenericRelation("files.File", related_query_name="products")

    class Meta:
        indexes = [
            models.Index(fields=['company']),
            models.Index(fields=['type']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name


class ProductPrice(BaseModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='prices')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, choices=CURRENCY_CHOICES)
    is_default = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['currency']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.price} {self.currency}"

    def clean(self):
        """
        Ensure only one default price per product
        """
        if self.is_default:
            exists = ProductPrice.objects.filter(
                product=self.product,
                is_default=True
            ).exclude(id=self.id).exists()

            if exists:
                raise ValidationError("Default price already exists for this product.")


class ProductInventory(BaseModel):
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='inventory'
    )

    quantity = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=0)

    track_stock = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['product']),
        ]

    def __str__(self):
        return f"{self.product.name} Inventory"

    def clean(self):
        """
        Ensure inventory only for products (not services)
        """
        if self.product.type == Product.SERVICE:
            raise ValidationError("Services cannot have inventory.")

    @property
    def is_low_stock(self):
        if not self.track_stock:
            return False
        return self.quantity <= self.min_stock
