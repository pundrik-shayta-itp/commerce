export class CartMemento {
  constructor(cartItems) {
    this.snapshot = cartItems.map((item) => ({ ...item }))
    this.createdAt = Date.now()
  }

  getSnapshot() {
    return this.snapshot.map((item) => ({ ...item }))
  }
}
