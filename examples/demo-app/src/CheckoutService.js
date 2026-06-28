// CheckoutService: drives the checkout flow from cart to order.

export class CheckoutService {
  constructor(cartService, orderService) {
    this.cartService = cartService;
    this.orderService = orderService;
  }

  async checkout(userId) {
    const cart = await this.cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }
    return this.orderService.createOrder(userId, cart.items);
  }
}
