from app.orders import total, apply_discount


def test_total_sums_prices():
    assert total([{"price": 2}, {"price": 3}]) == 5


def test_apply_discount_zero_percent():
    """Test discount with 0% - should return full amount.

    Note: This covers only the zero-discount case. The function
    should be tested with non-zero discounts (10%, 50%, etc.) to
    verify correct discount calculation behavior.
    """
    result = apply_discount([{"price": 100}], 0)
    assert result == 100
