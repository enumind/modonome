// CheckoutService: drives the checkout flow from cart to order.
// ENABLE_LEGACY_CHECKOUT is set to false; the legacy path below is
// unreachable and has never executed in this codebase.

const ENABLE_LEGACY_CHECKOUT = false;

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

    if (ENABLE_LEGACY_CHECKOUT) {
      // This branch is disabled and unreachable. ENABLE_LEGACY_CHECKOUT is
      // a const false, so the runtime never enters this block.
      return this._legacyCheckout(userId, cart);
    }

    return this.orderService.createOrder(userId, cart.items);
  }

  // This method is dead code: the only call site is behind ENABLE_LEGACY_CHECKOUT
  // which is const false. The method is retained here but never invoked.
  async _legacyCheckout(userId, cart) {
    throw new Error("Legacy checkout is disabled");
  }
}
