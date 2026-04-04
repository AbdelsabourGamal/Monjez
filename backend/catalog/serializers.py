from rest_framework import serializers

from .models import Product, ProductPrice, ProductInventory
from files.serializers import FileReadSerializer


# 🔹 PRICE
class ProductPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductPrice
        fields = ["id", "price", "currency", "is_default"]


# 🔹 INVENTORY
class ProductInventorySerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductInventory
        fields = ["quantity", "min_stock", "track_stock", "is_low_stock"]


# 🔹 PRODUCT
class ProductSerializer(serializers.ModelSerializer):
    prices = ProductPriceSerializer(many=True)
    inventory = ProductInventorySerializer(required=False)
    attachments = FileReadSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "type",
            "is_active",
            "prices",
            "inventory",
            "attachments",
            "created_at",
        ]

    def create(self, validated_data):
        prices_data = validated_data.pop("prices", [])
        inventory_data = validated_data.pop("inventory", None)

        request = self.context["request"]
        company = request.user.usercompany

        # 🔹 Create product
        product = Product.objects.create(company=company, **validated_data)

        # 🔹 Prices
        for price_data in prices_data:
            ProductPrice.objects.create(product=product, **price_data)

        # 🔹 Inventory (only for product)
        if product.type == Product.PRODUCT and inventory_data:
            ProductInventory.objects.create(product=product, **inventory_data)

        return product

    def update(self, instance, validated_data):
        prices_data = validated_data.pop("prices", None)
        inventory_data = validated_data.pop("inventory", None)

        # 🔹 update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 🔹 update prices (simple strategy: replace all)
        if prices_data is not None:
            instance.prices.all().delete()
            for price_data in prices_data:
                ProductPrice.objects.create(product=instance, **price_data)

        # 🔹 inventory
        if instance.type == Product.PRODUCT:
            if inventory_data:
                ProductInventory.objects.update_or_create(
                    product=instance,
                    defaults=inventory_data
                )
        else:
            # لو بقى service → امسح inventory
            instance.inventory.delete() if hasattr(instance, "inventory") else None

        return instance