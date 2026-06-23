// CheckoutService : ENABLE_LEGACY_CHECKOUT has been false in all environments
// for 62 days. Modonome proposed removing ~180 lines of dead code.
// (Dead branch shown here for illustration; Modonome's PR removed it.)

const ENABLE_LEGACY_CHECKOUT = false; // set in all envs since 2026-04-22

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
      // Legacy path : never executes. 180 lines of dead code removed by Modonome.
      return this._legacyCheckout(userId, cart);
    }

    return this.orderService.createOrder(userId, cart.items);
  }

  // Dead method : Modonome removed this in item-002.
  async _legacyCheckout(userId, cart) {
    throw new Error("Legacy checkout is disabled");
  }
}
