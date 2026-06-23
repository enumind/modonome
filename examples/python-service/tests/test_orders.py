from app.orders import total


def test_total_sums_prices():
    assert total([{"price": 2}, {"price": 3}]) == 5
