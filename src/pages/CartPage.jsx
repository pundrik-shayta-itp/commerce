import { useMemo, useState } from 'react'
import { QuantityControl } from '../components/QuantityControl.jsx'
import { useCommerce } from '../context/useCommerce.jsx'
import { useDebouncedValue } from '../hooks/useDebouncedValue.jsx'

export function CartPage() {
  const { cartItems, increaseQuantity, decreaseQuantity, removeProduct, checkOut, isCheckoutLocked } =
    useCommerce()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('name-asc')
  const debouncedQuery = useDebouncedValue(searchQuery, 300)
  const normalizedQuery = debouncedQuery.trim().toLowerCase()
  const categoryOptions = useMemo(
    () => ['all', ...new Set(cartItems.map((item) => item.category))],
    [cartItems],
  )
  const filteredCartItems = useMemo(() => {
    const filtered = cartItems.filter((item) => {
      const matchesName = item.title.toLowerCase().includes(normalizedQuery)
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory
      return matchesName && matchesCategory
    })

    filtered.sort((left, right) => {
      if (sortBy === 'price-asc') {
        return Number(left.price) - Number(right.price)
      }
      if (sortBy === 'price-desc') {
        return Number(right.price) - Number(left.price)
      }
      if (sortBy === 'qty-desc') {
        return right.quantity - left.quantity
      }
      if (sortBy === 'name-desc') {
        return right.title.localeCompare(left.title)
      }
      return left.title.localeCompare(right.title)
    })

    return filtered
  }, [cartItems, normalizedQuery, selectedCategory, sortBy])
  const total = useMemo(
    () =>
      filteredCartItems.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0,
      ),
    [filteredCartItems],
  )

  return (
    <section className="card">
      <div className="toolbar">
        <h2>My Cart</h2>
        <button type="button" className="btn" onClick={checkOut} disabled={isCheckoutLocked}>
          {isCheckoutLocked ? 'Processing checkout...' : 'Check Out'}
        </button>
      </div>
      <div className="filters">
        <input
          type="search"
          placeholder="Search cart by name"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
        >
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category === 'all' ? 'All categories' : category}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="name-asc">Sort: Name A-Z</option>
          <option value="name-desc">Sort: Name Z-A</option>
          <option value="price-asc">Sort: Price Low-High</option>
          <option value="price-desc">Sort: Price High-Low</option>
          <option value="qty-desc">Sort: Qty High-Low</option>
        </select>
      </div>
      {!cartItems.length ? (
        <p>No products in cart.</p>
      ) : !filteredCartItems.length ? (
        <p>No cart items found for selected filters.</p>
      ) : (
        <>
          {filteredCartItems.map((item) => (
            <article key={item.id} className="cart-row">
              <div className="product-main">
                <img src={item.image} alt={item.title} className="product-image" />
                <div>
                  <strong>{item.title}</strong>
                  <div>${Number(item.price).toFixed(2)}</div>
                </div>
              </div>
              <div className="cart-actions">
                <QuantityControl
                  quantity={item.quantity}
                  onIncrease={() => increaseQuantity(item.id)}
                  onDecrease={() => decreaseQuantity(item.id)}
                />
                <button type="button" className="btn" onClick={() => removeProduct(item.id)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
          <h3>Total: ${total.toFixed(2)}</h3>
        </>
      )}
    </section>
  )
}
