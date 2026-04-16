import { NavLink, useNavigate } from 'react-router-dom'
import { useCommerce } from '../context/useCommerce.jsx'

export function SidebarLayout({ children }) {
  const { user, cartItems, logout } = useCommerce()
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h3>Commerce</h3>
        <small>{user?.username}</small>
        <NavLink to="/app/items">All Items</NavLink>
        <NavLink to="/app/cart">My Cart</NavLink>
        <NavLink to="/app/orders">Orders</NavLink>
        <NavLink to="/app/history">Lifecycle Logs</NavLink>
        <hr style={{ width: '100%', borderColor: '#334155' }} />
        <span>Cart Items: {cartItems.length}</span>
        <button type="button" className="btn" onClick={onLogout}>
          Logout
        </button>
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}
