const PRODUCT_CACHE_KEY = 'commerce.catalog.500'

export async function loginRequest(credentials) {
  const response = await fetch('https://fakestoreapi.com/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    throw new Error('Login failed')
  }

  return response.json()
}

export async function fetchProducts() {
  const cached = localStorage.getItem(PRODUCT_CACHE_KEY)
  if (cached) {
    return JSON.parse(cached)
  }

  const response = await fetch('https://fakestoreapi.com/products')
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  const baseProducts = await response.json()
  const expanded = expandProducts(baseProducts)
  localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(expanded))
  return expanded
}

function expandProducts(baseProducts) {
  const variantsPerProduct = 25
  const expanded = []

  baseProducts.forEach((product) => {
    for (let variantIndex = 0; variantIndex < variantsPerProduct; variantIndex += 1) {
      const multiplier = 1 + variantIndex * 0.03
      expanded.push({
        ...product,
        id: product.id * 100 + variantIndex + 1,
        baseId: product.id,
        title: `${product.title} - Variant ${variantIndex + 1}`,
        price: Number((product.price * multiplier).toFixed(2)),
      })
    }
  })

  return expanded
}
