import { CartState } from './CartState.js'

export class HasProductState extends CartState {
  constructor() {
    super('hasProduct')
  }

  addProduct(context, product) {
    context.upsertCartItem(product, 1)
    context.notify('success', `${product.title} added to cart`)
  }

  increaseQuantity(context, productId) {
    const product = context.products.find((item) => item.id === productId)
    if (!product) {
      return
    }
    context.upsertCartItem(product, 1)
    context.notify('info', `${product.title} quantity increased`)
  }

  decreaseQuantity(context, productId) {
    const result = context.changeQuantity(productId, -1)
    if (!result) {
      context.notify('warn', 'Nothing in cart')
      return
    }

    if (result.removed) {
      context.notify('info', `${result.title} removed from cart`)
    } else {
      context.notify('info', `${result.title} quantity decreased`)
    }

    if (!context.cartItems.length) {
      context.setState(context.noProductState)
    }
  }

  removeProduct(context, productId) {
    const removed = context.removeFromCart(productId)
    if (!removed) {
      context.notify('warn', 'Nothing in cart')
      return
    }

    context.notify('success', `${removed.title} removed successfully`)
    if (!context.cartItems.length) {
      context.setState(context.noProductState)
    }
  }

  async checkOut(context) {
    context.notify('info', 'Checkout operation started')
    context.saveMemento()
    let idempotencyKey = ''

    try {
      idempotencyKey = context.beginCheckoutSubmission()
      await new Promise((resolve) => {
        window.setTimeout(resolve, 450)
      })
      const order = context.checkoutProcessor.execute(context)
      context.addTimelineStep('ORDER_SUBMITTED', 'Order submitted to simulated endpoint')
      context.notify('info', 'Order submitted')
      context.registerOrder(order)
      context.clearCart()
      context.discardLastMemento()
      context.setState(context.successfulState)
      context.completeCheckoutSubmission({ idempotencyKey, success: true })
      context.notify('success', 'Checkout completed successfully')
      context.scheduleSuccessfulToNoProduct()
    } catch (error) {
      context.completeCheckoutSubmission({ idempotencyKey, success: false })
      context.rollbackMemento()
      context.addTimelineStep('ROLLED_BACK', 'Checkout failure triggered rollback')
      const isTampered = error.message.includes('tampering')
      context.notify(
        'error',
        isTampered ? 'Found data tampering' : `Checkout failed: ${error.message}`,
      )
    }
  }
}
