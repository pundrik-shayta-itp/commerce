import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import './App.css'
import { NotificationList } from './components/NotificationList.jsx'
import { SidebarLayout } from './components/SidebarLayout.jsx'
import { useCommerce } from './context/useCommerce.jsx'

const LoginPage = lazy(() =>
  import('./pages/LoginPage.jsx').then((module) => ({ default: module.LoginPage })),
)
const ItemsPage = lazy(() =>
  import('./pages/ItemsPage.jsx').then((module) => ({ default: module.ItemsPage })),
)
const CartPage = lazy(() =>
  import('./pages/CartPage.jsx').then((module) => ({ default: module.CartPage })),
)
const OrdersPage = lazy(() =>
  import('./pages/OrdersPage.jsx').then((module) => ({ default: module.OrdersPage })),
)
const LifecyclePage = lazy(() =>
  import('./pages/LifecyclePage.jsx').then((module) => ({ default: module.LifecyclePage })),
)

function AppShell() {
  return (
    <SidebarLayout>
      <Outlet />
    </SidebarLayout>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isHydrated } = useCommerce()
  if (!isHydrated) {
    return <div className="route-loader">Loading session...</div>
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function PublicLoginRoute({ children }) {
  const { isAuthenticated, isHydrated } = useCommerce()
  if (!isHydrated) {
    return <div className="route-loader">Loading session...</div>
  }
  if (isAuthenticated) {
    return <Navigate to="/app/items" replace />
  }
  return children
}

function App() {
  const { notifications, dismissNotification } = useCommerce()

  return (
    <>
      <Suspense fallback={<div className="route-loader">Loading page...</div>}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicLoginRoute>
                <LoginPage />
              </PublicLoginRoute>
            }
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/items" replace />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="history" element={<LifecyclePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/app/items" replace />} />
        </Routes>
        <NotificationList notifications={notifications} onDismiss={dismissNotification} />
      </Suspense>
    </>
  )
}

export default App
