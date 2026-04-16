import { createContext, useEffect, useRef, useState } from 'react'
import { fetchProducts, loginRequest } from '../api/fakeStore.js'
import {
  fetchRemoteBootstrap,
  pushOrderToRemote,
  pushSessionSnapshotToRemote,
  pushTimelineStepToRemote,
} from '../api/jsonPlaceholder.js'
import { CartMemento } from '../patterns/memento/CartMemento.js'
import { NotificationCenter } from '../patterns/observer/NotificationCenter.js'
import { HasProductState } from '../patterns/state/HasProductState.js'
import { NoProductState } from '../patterns/state/NoProductState.js'
import { SuccessfulState } from '../patterns/state/SuccessfulState.js'
import { CheckoutTemplate } from '../patterns/template/CheckoutTemplate.js'

const CommerceContext = createContext(null)

const notificationCenter = new NotificationCenter()
const STORAGE_KEYS = {
  session: 'commerce.session',
  cart: 'commerce.cart',
  history: 'commerce.history',
  state: 'commerce.state',
  products: 'commerce.products',
  productSignature: 'commerce.products.signature',
  checkoutToken: 'commerce.checkout.token',
  idempotency: 'commerce.checkout.idempotency',
  timeline: 'commerce.checkout.timeline',
  userProfiles: 'commerce.user.profiles',
}

export function CommerceProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authToken, setAuthToken] = useState('')
  const [products, setProducts] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [history, setHistory] = useState([])
  const [notifications, setNotifications] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [currentState, setCurrentState] = useState(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isCheckoutLocked, setIsCheckoutLocked] = useState(false)
  const [checkoutToken, setCheckoutToken] = useState(null)
  const [checkoutTimeline, setCheckoutTimeline] = useState([])
  const [submittedIdempotencyKeys, setSubmittedIdempotencyKeys] = useState([])
  const [performanceMetrics, setPerformanceMetrics] = useState({
    productsLoadMs: 0,
    checkoutValidationMs: 0,
    checkoutSubmissionMs: 0,
  })

  const mementoStack = useRef([])
  const successStateTimer = useRef(null)
  const checkoutLockRef = useRef(false)
  const noProductState = useRef(new NoProductState()).current
  const hasProductState = useRef(new HasProductState()).current
  const successfulState = useRef(new SuccessfulState()).current
  const checkoutProcessor = useRef(new CheckoutTemplate()).current

  const getStateFromName = (stateName, cartLength) => {
    if (stateName === hasProductState.name) {
      return hasProductState
    }
    if (stateName === successfulState.name) {
      return noProductState
    }
    return cartLength ? hasProductState : noProductState
  }

  const readProfiles = () => {
    const raw = localStorage.getItem(STORAGE_KEYS.userProfiles)
    if (!raw) {
      return {}
    }
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }

  const writeProfiles = (profiles) => {
    localStorage.setItem(STORAGE_KEYS.userProfiles, JSON.stringify(profiles))
  }

  const restoreUserProfile = (username) => {
    const profiles = readProfiles()
    const profile = profiles[username]
    if (!profile) {
      return false
    }

    const nextCart = profile.cartItems ?? []
    setCartItems(nextCart)
    setCartChecksum(createChecksum(nextCart))
    setHistory(profile.history ?? [])
    setCheckoutTimeline(profile.checkoutTimeline ?? [])
    setSubmittedIdempotencyKeys(profile.submittedIdempotencyKeys ?? [])
    setCheckoutToken(profile.checkoutToken ?? createCheckoutToken())
    setCurrentState(getStateFromName(profile.currentStateName, nextCart.length))
    return true
  }

  const createChecksum = (items = []) => {
    return JSON.stringify(
      items
        .map((item) => ({ id: item.id, quantity: item.quantity, price: item.price }))
        .sort((a, b) => a.id - b.id),
    )
  }

  const createProductsSignature = (catalog = []) => {
    return JSON.stringify(
      catalog
        .map((item) => ({ id: item.id, price: item.price, title: item.title, image: item.image }))
        .sort((a, b) => a.id - b.id),
    )
  }

  const createCheckoutToken = () => ({
    value: crypto.randomUUID(),
    expiresAt: Date.now() + 15 * 60 * 1000,
    used: false,
  })

  const addTimelineStep = (status, reason = '') => {
    const latest = checkoutTimeline[checkoutTimeline.length - 1]
    if (latest && latest.status === status && latest.reason === reason) {
      return latest
    }
    const step = {
      id: crypto.randomUUID(),
      status,
      reason,
      timestamp: new Date().toISOString(),
    }
    setCheckoutTimeline((prev) => [...prev, step].slice(-20))
    if (user?.username) {
      void pushTimelineStepToRemote(user.username, step)
    }
    return step
  }

  const [cartChecksum, setCartChecksum] = useState(createChecksum([]))
  const [productsSignature, setProductsSignature] = useState(createProductsSignature([]))

  useEffect(() => {
    const unsubscribe = notificationCenter.subscribe((event) => {
      setNotifications((prev) => [event, ...prev].slice(0, 30))
      window.setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== event.id))
      }, 3200)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!currentState) {
      setCurrentState(noProductState)
    }
  }, [currentState, noProductState])

  useEffect(() => {
    try {
      const rawSession = localStorage.getItem(STORAGE_KEYS.session)
      const rawCart = localStorage.getItem(STORAGE_KEYS.cart)
      const rawHistory = localStorage.getItem(STORAGE_KEYS.history)
      const rawState = localStorage.getItem(STORAGE_KEYS.state)
      const rawProducts = localStorage.getItem(STORAGE_KEYS.products)
      const rawProductSignature = localStorage.getItem(STORAGE_KEYS.productSignature)
      const rawCheckoutToken = localStorage.getItem(STORAGE_KEYS.checkoutToken)
      const rawIdempotency = localStorage.getItem(STORAGE_KEYS.idempotency)
      const rawTimeline = localStorage.getItem(STORAGE_KEYS.timeline)

      if (rawSession) {
        const parsedSession = JSON.parse(rawSession)
        if (parsedSession.user) {
          setUser(parsedSession.user)
          restoreUserProfile(parsedSession.user.username)
        }
        if (parsedSession.authToken) {
          setAuthToken(parsedSession.authToken)
        }
      }

      if (rawProducts) {
        const parsedProducts = JSON.parse(rawProducts)
        setProducts(parsedProducts)
      }

      if (rawProductSignature) {
        setProductsSignature(rawProductSignature)
      }

      if (rawCart) {
        const parsedCart = JSON.parse(rawCart)
        setCartItems(parsedCart)
        setCartChecksum(createChecksum(parsedCart))
        setCurrentState(getStateFromName(rawState, parsedCart.length))
      } else if (rawState === successfulState.name) {
        setCurrentState(noProductState)
      }

      if (rawHistory) {
        setHistory(JSON.parse(rawHistory))
      }

      if (rawCheckoutToken) {
        setCheckoutToken(JSON.parse(rawCheckoutToken))
      } else {
        setCheckoutToken(createCheckoutToken())
      }

      if (rawIdempotency) {
        setSubmittedIdempotencyKeys(JSON.parse(rawIdempotency))
      }

      if (rawTimeline) {
        setCheckoutTimeline(JSON.parse(rawTimeline))
      } else {
        addTimelineStep('CART_READY')
      }
    } catch {
      notificationCenter.notify({
        type: 'error',
        message: 'Stored data is invalid and was ignored',
      })
    } finally {
      setIsHydrated(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProductState, noProductState, successfulState])

  useEffect(() => {
    if (!isHydrated) {
      return
    }
    if (!user || !authToken) {
      localStorage.removeItem(STORAGE_KEYS.session)
      return
    }
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ user, authToken }))
  }, [user, authToken, isHydrated])

  useEffect(() => {
    if (!isHydrated || !user?.username) {
      return
    }

    const profiles = readProfiles()
    profiles[user.username] = {
      cartItems,
      history,
      currentStateName: currentState?.name ?? 'noProduct',
      checkoutTimeline,
      submittedIdempotencyKeys,
      checkoutToken,
      updatedAt: new Date().toISOString(),
    }
    writeProfiles(profiles)
  }, [
    isHydrated,
    user,
    cartItems,
    history,
    currentState,
    checkoutTimeline,
    submittedIdempotencyKeys,
    checkoutToken,
  ])

  useEffect(() => {
    if (!isHydrated) {
      return
    }
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cartItems))
  }, [cartItems, isHydrated])

  useEffect(() => {
    if (!isHydrated) {
      return
    }
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history))
  }, [history, isHydrated])

  useEffect(() => {
    if (!isHydrated) {
      return
    }
    if (!currentState) {
      return
    }
    localStorage.setItem(STORAGE_KEYS.state, currentState.name)
  }, [currentState, isHydrated])

  useEffect(() => {
    if (!isHydrated) {
      return
    }
    if (!products.length) {
      return
    }
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products))
    localStorage.setItem(STORAGE_KEYS.productSignature, productsSignature)
  }, [products, productsSignature, isHydrated])

  useEffect(() => {
    if (!isHydrated || !checkoutToken) {
      return
    }
    localStorage.setItem(STORAGE_KEYS.checkoutToken, JSON.stringify(checkoutToken))
  }, [checkoutToken, isHydrated])

  useEffect(() => {
    if (!isHydrated) {
      return
    }
    localStorage.setItem(STORAGE_KEYS.idempotency, JSON.stringify(submittedIdempotencyKeys))
  }, [submittedIdempotencyKeys, isHydrated])

  useEffect(() => {
    if (!isHydrated) {
      return
    }
    localStorage.setItem(STORAGE_KEYS.timeline, JSON.stringify(checkoutTimeline))
  }, [checkoutTimeline, isHydrated])

  useEffect(() => {
    if (!isHydrated || !user?.username) {
      return
    }
    const snapshot = {
      state: currentState?.name ?? 'noProduct',
      cartItemsCount: cartItems.length,
      ordersCount: history.length,
      timelineCount: checkoutTimeline.length,
      updatedAt: new Date().toISOString(),
    }
    void pushSessionSnapshotToRemote(user.username, snapshot)
  }, [isHydrated, user, currentState, cartItems.length, history.length, checkoutTimeline.length])

  useEffect(() => {
    if (!isHydrated) {
      return
    }
    if (cartItems.length > 0) {
      addTimelineStep('CART_READY', 'Cart contains items ready for checkout')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.length, isHydrated])

  useEffect(() => {
    return () => {
      if (successStateTimer.current) {
        clearTimeout(successStateTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    const onStorage = (event) => {
      if (!event.key) {
        return
      }

      if (event.key === STORAGE_KEYS.session) {
        if (!event.newValue) {
          setUser(null)
          setAuthToken('')
        } else {
          const parsed = JSON.parse(event.newValue)
          setUser(parsed.user ?? null)
          setAuthToken(parsed.authToken ?? '')
        }
      }

      if (event.key === STORAGE_KEYS.cart && event.newValue) {
        const nextCart = JSON.parse(event.newValue)
        setCartItems(nextCart)
        setCartChecksum(createChecksum(nextCart))
        setState(nextCart.length ? hasProductState : noProductState)
        notify('info', 'Cart updated from another tab')
      }

      if (event.key === STORAGE_KEYS.state && event.newValue) {
        if (event.newValue === hasProductState.name) {
          setState(hasProductState)
        } else if (event.newValue === successfulState.name) {
          setState(noProductState)
        } else {
          setState(noProductState)
        }
      }

      if (event.key === STORAGE_KEYS.history && event.newValue) {
        setHistory(JSON.parse(event.newValue))
      }

      if (event.key === STORAGE_KEYS.userProfiles && user?.username) {
        restoreUserProfile(user.username)
      }

      if (event.key === STORAGE_KEYS.checkoutToken && event.newValue) {
        setCheckoutToken(JSON.parse(event.newValue))
      }

      if (event.key === STORAGE_KEYS.idempotency && event.newValue) {
        setSubmittedIdempotencyKeys(JSON.parse(event.newValue))
      }

      if (event.key === STORAGE_KEYS.timeline && event.newValue) {
        setCheckoutTimeline(JSON.parse(event.newValue))
      }

      if (event.key === STORAGE_KEYS.products && event.newValue) {
        const nextProducts = JSON.parse(event.newValue)
        setProducts(nextProducts)
      }

      if (event.key === STORAGE_KEYS.productSignature && event.newValue) {
        setProductsSignature(event.newValue)
        const currentProductsHash = createProductsSignature(products)
        if (event.newValue !== currentProductsHash) {
          notify('error', 'Found data tampering from another tab')
          rollbackMemento()
        }
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProductState, noProductState, products, successfulState, user])

  const syncChecksum = (nextCart) => {
    setCartChecksum(createChecksum(nextCart))
  }

  const validateCartWithProducts = (authoritativeProducts, candidateCart) => {
    const productMap = new Map(authoritativeProducts.map((item) => [item.id, item]))
    return candidateCart.every((item) => {
      const source = productMap.get(item.id)
      if (!source) {
        return false
      }
      return (
        Number(source.price) === Number(item.price) &&
        source.title === item.title &&
        source.image === item.image
      )
    })
  }

  const notify = (type, message) => {
    notificationCenter.notify({ type, message })
  }

  const dismissNotification = (notificationId) => {
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId))
  }

  const setState = (stateInstance) => {
    setCurrentState(stateInstance)
  }

  const scheduleSuccessfulToNoProduct = () => {
    if (successStateTimer.current) {
      clearTimeout(successStateTimer.current)
    }

    successStateTimer.current = window.setTimeout(() => {
      setState(noProductState)
    }, 1500)
  }

  const upsertCartItem = (product, amount) => {
    setCartItems((prev) => {
      const exists = prev.find((item) => item.id === product.id)
      let next
      if (!exists) {
        next = [...prev, { ...product, quantity: amount }]
      } else {
        next = prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.max(0, item.quantity + amount) }
            : item,
        )
      }
      next = next.filter((item) => item.quantity > 0)
      syncChecksum(next)
      return next
    })
  }

  const changeQuantity = (productId, delta) => {
    const target = cartItems.find((item) => item.id === productId)
    if (!target) {
      return null
    }

    const nextQuantity = target.quantity + delta
    if (nextQuantity <= 0) {
      setCartItems((prev) => {
        const next = prev.filter((item) => item.id !== productId)
        syncChecksum(next)
        return next
      })
      return { removed: true, title: target.title }
    }

    setCartItems((prev) => {
      const next = prev.map((item) =>
        item.id === productId ? { ...item, quantity: nextQuantity } : item,
      )
      syncChecksum(next)
      return next
    })

    return { removed: false, title: target.title }
  }

  const removeFromCart = (productId) => {
    const target = cartItems.find((item) => item.id === productId)
    if (!target) {
      return null
    }
    setCartItems((prev) => {
      const next = prev.filter((item) => item.id !== productId)
      syncChecksum(next)
      return next
    })
    return target
  }

  const saveMemento = () => {
    mementoStack.current.push(new CartMemento(cartItems))
  }

  const rollbackMemento = () => {
    const previous = mementoStack.current.pop()
    if (!previous) {
      return
    }
    const restored = previous.getSnapshot()
    setCartItems(restored)
    syncChecksum(restored)
    setState(restored.length ? hasProductState : noProductState)
  }

  const discardLastMemento = () => {
    mementoStack.current.pop()
  }

  const syncFromStorageSnapshot = () => {
    const rawCart = localStorage.getItem(STORAGE_KEYS.cart)
    const rawHistory = localStorage.getItem(STORAGE_KEYS.history)
    const rawState = localStorage.getItem(STORAGE_KEYS.state)

    const nextCart = rawCart ? JSON.parse(rawCart) : []
    const nextHistory = rawHistory ? JSON.parse(rawHistory) : []

    setCartItems(nextCart)
    setCartChecksum(createChecksum(nextCart))
    setHistory(nextHistory)

    if (rawState === hasProductState.name) {
      setState(hasProductState)
    } else if (rawState === successfulState.name) {
      setState(noProductState)
    } else {
      setState(nextCart.length ? hasProductState : noProductState)
    }
  }

  const ensureLatestBeforeCheckout = () => {
    const rawCart = localStorage.getItem(STORAGE_KEYS.cart)
    const rawState = localStorage.getItem(STORAGE_KEYS.state)
    const latestCart = rawCart ? JSON.parse(rawCart) : []
    const latestChecksum = createChecksum(latestCart)

    const sameCart = latestChecksum === cartChecksum
    const sameState =
      (rawState ?? noProductState.name) === (currentState?.name ?? noProductState.name)

    if (sameCart && sameState) {
      return true
    }

    syncFromStorageSnapshot()
    addTimelineStep('ORDER_INCONSISTENT', 'Stale cart or state mismatch across tabs')
    notify('error', 'Cart changed in another tab. Refreshed to current state.')
    return false
  }

  const buildIdempotencyKey = () => {
    const tokenValue = checkoutToken?.value ?? 'missing-token'
    return `${cartChecksum}:${tokenValue}`
  }

  const validateCheckoutToken = () => {
    if (!checkoutToken) {
      setCheckoutToken(createCheckoutToken())
      addTimelineStep('ORDER_FAILED', 'Token missing, rotated')
      throw new Error('Checkout token missing. Please retry.')
    }

    if (checkoutToken.expiresAt < Date.now()) {
      setCheckoutToken(createCheckoutToken())
      addTimelineStep('ORDER_FAILED', 'Token expired')
      throw new Error('Checkout token expired. New token issued, retry checkout.')
    }

    if (checkoutToken.used) {
      setCheckoutToken(createCheckoutToken())
      addTimelineStep('ORDER_FAILED', 'Token reuse detected')
      throw new Error('Checkout token reuse detected. New token issued, retry checkout.')
    }
  }

  const beginCheckoutSubmission = () => {
    if (checkoutLockRef.current) {
      notify('warning', 'Retry blocked by idempotency / checkout lock')
      throw new Error('Checkout already in progress')
    }

    const key = buildIdempotencyKey()
    if (submittedIdempotencyKeys.includes(key)) {
      notify('warning', 'Retry blocked by idempotency')
      addTimelineStep('ORDER_FAILED', 'Duplicate checkout blocked by idempotency')
      throw new Error('Duplicate checkout blocked')
    }

    checkoutLockRef.current = true
    setIsCheckoutLocked(true)
    addTimelineStep('ORDER_SUBMITTED', 'Checkout submission started')
    return key
  }

  const completeCheckoutSubmission = ({ idempotencyKey, success }) => {
    checkoutLockRef.current = false
    setIsCheckoutLocked(false)

    if (success) {
      setSubmittedIdempotencyKeys((prev) =>
        [...prev, idempotencyKey].slice(-100),
      )
      setCheckoutToken((prev) => (prev ? { ...prev, used: true } : prev))
      addTimelineStep('ORDER_SUCCESS', 'Order completed')
      return
    }

    addTimelineStep('ORDER_FAILED', 'Submission failed')
  }

  const clearCart = () => {
    setCartItems([])
    syncChecksum([])
  }

  const registerOrder = (order) => {
    setHistory((prev) => [order, ...prev])
    if (user?.username) {
      void pushOrderToRemote(user.username, order)
    }
  }

  const removeOrder = (orderId) => {
    setHistory((prev) => prev.filter((order) => order.id !== orderId))
    notify('info', 'Order removed from local history')
  }

  const clearOrders = () => {
    setHistory([])
    notify('warning', 'All orders cleared from local history')
  }

  const removeTimelineLog = (logId) => {
    setCheckoutTimeline((prev) => prev.filter((step) => step.id !== logId))
    notify('info', 'Lifecycle log removed')
  }

  const clearTimelineLogs = () => {
    setCheckoutTimeline([])
    notify('warning', 'All lifecycle logs cleared')
  }

  const login = async (credentials) => {
    const result = await loginRequest(credentials)
    setUser({ username: credentials.username })
    setAuthToken(result.token ?? 'demo-token')
    const hasLocalProfile = restoreUserProfile(credentials.username)
    if (!hasLocalProfile) {
      setCheckoutToken(createCheckoutToken())
    }
    try {
      const remote = await fetchRemoteBootstrap(credentials.username)
      if (!hasLocalProfile && remote.orders.length) {
        setHistory(remote.orders)
      }
      if (!hasLocalProfile && remote.logs.length) {
        setCheckoutTimeline(remote.logs)
      }
    } catch {
      notify('warning', 'Could not load remote history logs')
    }
    notify('success', 'Login successful')
  }

  const logout = () => {
    setUser(null)
    setAuthToken('')
    setProducts([])
    setCartItems([])
    setHistory([])
    setCheckoutTimeline([])
    setSubmittedIdempotencyKeys([])
    setCheckoutToken(null)
    setIsCheckoutLocked(false)
    checkoutLockRef.current = false
    syncChecksum([])
    setState(noProductState)
    localStorage.removeItem(STORAGE_KEYS.state)
    localStorage.removeItem(STORAGE_KEYS.checkoutToken)
    localStorage.removeItem(STORAGE_KEYS.idempotency)
    localStorage.removeItem(STORAGE_KEYS.timeline)
  }

  const loadProducts = async () => {
    setIsLoadingProducts(true)
    const start = performance.now()
    try {
      const data = await fetchProducts()
      setProducts(data)
      const nextSignature = createProductsSignature(data)
      setProductsSignature(nextSignature)
    } catch {
      notify('error', 'Fail to fetch from API')
    } finally {
      setIsLoadingProducts(false)
      setPerformanceMetrics((prev) => ({
        ...prev,
        productsLoadMs: Number((performance.now() - start).toFixed(2)),
      }))
    }
  }

  const validateCheckoutSecurity = () => {
    const storedProductsRaw = localStorage.getItem(STORAGE_KEYS.products)
    const storedProductSignature = localStorage.getItem(STORAGE_KEYS.productSignature)

    if (!storedProductsRaw || !storedProductSignature) {
      throw new Error('Missing secured product catalog')
    }

    const storedProducts = JSON.parse(storedProductsRaw)
    const currentSignature = createProductsSignature(products)
    const securedSignature = createProductsSignature(storedProducts)

    if (storedProductSignature !== securedSignature || productsSignature !== currentSignature) {
      throw new Error('Data tampering detected')
    }

    if (!validateCartWithProducts(storedProducts, cartItems)) {
      throw new Error('Data tampering detected')
    }
  }

  const addProduct = (product) => currentState?.addProduct(boundContext, product)
  const increaseQuantity = (productId) =>
    currentState?.increaseQuantity(boundContext, productId)
  const decreaseQuantity = (productId) =>
    currentState?.decreaseQuantity(boundContext, productId)
  const removeProduct = (productId) => currentState?.removeProduct(boundContext, productId)
  const checkOut = () => {
    if (!ensureLatestBeforeCheckout()) {
      return
    }
    const validationStart = performance.now()
    try {
      validateCheckoutToken()
      addTimelineStep('CHECKOUT_VALIDATED', 'Validation passed')
      notify('info', 'Checkout validation passed')
      setPerformanceMetrics((prev) => ({
        ...prev,
        checkoutValidationMs: Number((performance.now() - validationStart).toFixed(2)),
      }))
    } catch (error) {
      notify('error', `Checkout validation failed: ${error.message}`)
      return
    }
    const submitStart = performance.now()
    currentState?.checkOut(boundContext)
    setPerformanceMetrics((prev) => ({
      ...prev,
      checkoutSubmissionMs: Number((performance.now() - submitStart).toFixed(2)),
    }))
  }
  const isAuthenticated = Boolean(user && authToken)

  const boundContext = {
    user,
    authToken,
    products,
    cartItems,
    cartChecksum,
    noProductState,
    hasProductState,
    successfulState,
    checkoutProcessor,
    createChecksum,
    validateCheckoutSecurity,
    setState,
    notify,
    upsertCartItem,
    changeQuantity,
    removeFromCart,
    saveMemento,
    rollbackMemento,
    discardLastMemento,
    scheduleSuccessfulToNoProduct,
    syncFromStorageSnapshot,
    ensureLatestBeforeCheckout,
    beginCheckoutSubmission,
    completeCheckoutSubmission,
    addTimelineStep,
    clearCart,
    registerOrder,
  }

  return (
    <CommerceContext.Provider
      value={{
        user,
        isAuthenticated,
        isHydrated,
        products,
        cartItems,
        history,
        currentStateName: currentState?.name ?? 'noProduct',
        notifications,
        dismissNotification,
        isLoadingProducts,
        isCheckoutLocked,
        checkoutTimeline,
        performanceMetrics,
        login,
        logout,
        loadProducts,
        addProduct,
        increaseQuantity,
        decreaseQuantity,
        removeProduct,
        checkOut,
        removeOrder,
        clearOrders,
        removeTimelineLog,
        clearTimelineLogs,
      }}
    >
      {children}
    </CommerceContext.Provider>
  )
}
export { CommerceContext }
