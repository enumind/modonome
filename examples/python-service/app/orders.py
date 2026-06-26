def total(items):
    return sum(item["price"] for item in items)


def apply_discount(items, discount_percent):
    """Apply a percentage discount to a list of items.

    Args:
        items: List of dicts with "price" key
        discount_percent: Discount percentage (0-100)

    Returns:
        Total after discount
    """
    subtotal = total(items)
    discount_amount = subtotal * (discount_percent / 100)
    return subtotal - discount_amount
