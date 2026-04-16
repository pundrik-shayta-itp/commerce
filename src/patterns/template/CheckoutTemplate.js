export class CheckoutTemplate {
  execute(context) {
    this.validate(context)
    this.detectTampering(context)
    this.tokenCheck(context)
    const order = this.process(context)
    return this.success(context, order)
  }

  validate(context) {
    if (!context.cartItems.length) {
      throw new Error('Nothing in cart')
    }
  }

  detectTampering(context) {
    const currentChecksum = context.createChecksum(context.cartItems)
    if (currentChecksum !== context.cartChecksum) {
      throw new Error('Data tampering detected')
    }
    context.validateCheckoutSecurity()
  }

  tokenCheck(context) {
    if (!context.authToken) {
      throw new Error('Missing auth token')
    }
  }

  process(context) {
    const total = context.cartItems.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    )

    return {
      id: `ORD-${Date.now()}`,
      items: context.cartItems.map((item) => ({ ...item })),
      total,
      createdAt: new Date().toISOString(),
    }
  }

  success(context, order) {
    return order
  }
}
