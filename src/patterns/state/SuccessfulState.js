import { CartState } from './CartState.js'

export class SuccessfulState extends CartState {
  constructor() {
    super('successful')
  }

  addProduct(context, product) {
    context.upsertCartItem(product, 1)
    context.setState(context.hasProductState)
    context.notify('success', `${product.title} added to new cart`)
  }

  increaseQuantity(context, productId) {
    const product = context.products.find((item) => item.id === productId)
    if (product) {
      this.addProduct(context, product)
    }
  }

  decreaseQuantity(context) {
    context.notify('warn', 'Nothing in cart')
  }

  removeProduct(context) {
    context.notify('warn', 'Nothing in cart')
  }

  checkOut(context) {
    context.notify('warn', 'Nothing in cart')
  }
}
