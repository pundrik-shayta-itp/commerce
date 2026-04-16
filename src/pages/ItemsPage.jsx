import { useEffect, useMemo, useState } from 'react'
import { List } from 'react-window'
import { QuantityControl } from '../components/QuantityControl.jsx'
import { useCommerce } from '../context/useCommerce.jsx'
import { useDebouncedValue } from '../hooks/useDebouncedValue.jsx'

function ProductRow({ index, style, products, cartMap, addProduct, increaseQuantity, decreaseQuantity }) {
  const product = products[index]
  const quantity = cartMap.get(product.id) ?? 0

  return (
    <div style={style} className="product-row">
      <div className="product-main">
        <img src={product.image} alt={product.title} className="product-image" />
        <div>
        <strong>{product.title}</strong>
        <div>${Number(product.price).toFixed(2)}</div>
        </div>
      </div>
      {quantity > 0 ? (
        <QuantityControl
          quantity={quantity}
          onIncrease={() => increaseQuantity(product.id)}
          onDecrease={() => decreaseQuantity(product.id)}
        />
      ) : (
        <button type="button" className="btn" onClick={() => addProduct(product)}>
          Add to cart
        </button>
      )}
    </div>
  )
}

export function ItemsPage() {
  const { products, cartItems, addProduct, increaseQuantity, decreaseQuantity, loadProducts, isLoadingProducts } =
    useCommerce()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('name-asc')
  const [rowHeight, setRowHeight] = useState(96)
  const debouncedQuery = useDebouncedValue(searchQuery, 300)

  useEffect(() => {
    if (!products.length) {
      void loadProducts()
    }
  }, [products.length, loadProducts])

  useEffect(() => {
    const onResize = () => {
      setRowHeight(window.innerWidth < 640 ? 132 : 96)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const cartMap = useMemo(
    () => new Map(cartItems.map((item) => [item.id, item.quantity])),
    [cartItems],
  )
  const categoryOptions = useMemo(
    () => ['all', ...new Set(products.map((item) => item.category))],
    [products],
  )
  const normalizedQuery = debouncedQuery.trim().toLowerCase()
  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesName = product.title.toLowerCase().includes(normalizedQuery)
      const matchesCategory =
        selectedCategory === 'all' || product.category === selectedCategory
      return matchesName && matchesCategory
    })

    filtered.sort((left, right) => {
      if (sortBy === 'price-asc') {
        return Number(left.price) - Number(right.price)
      }
      if (sortBy === 'price-desc') {
        return Number(right.price) - Number(left.price)
      }
      if (sortBy === 'name-desc') {
        return right.title.localeCompare(left.title)
      }
      return left.title.localeCompare(right.title)
    })

    return filtered
  }, [products, normalizedQuery, selectedCategory, sortBy])

  return (
    <section className="card">
      <div className="toolbar">
        <h2>All Items</h2>
        <span>{filteredProducts.length} products</span>
      </div>
      <div className="filters">
        <input
          type="search"
          placeholder="Search by product name"
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
        </select>
      </div>
      {isLoadingProducts ? (
        <p>Loading products...</p>
      ) : !filteredProducts.length ? (
        <p>No products found for selected filters.</p>
      ) : (
        <List
          rowCount={filteredProducts.length}
          rowHeight={rowHeight}
          rowComponent={ProductRow}
          rowProps={{
            products: filteredProducts,
            cartMap,
            addProduct,
            increaseQuantity,
            decreaseQuantity,
          }}
          style={{ height: '70vh' }}
        />
      )}
    </section>
  )
}
