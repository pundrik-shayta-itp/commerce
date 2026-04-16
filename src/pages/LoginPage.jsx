import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCommerce } from '../context/useCommerce.jsx'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useCommerce()
  const [form, setForm] = useState({ username: 'john_doe', password: 'pass123' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(form)
      navigate('/app/items', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>Login</h1>
        <p>Use username and password to enter commerce frontend.</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            value={form.username}
            onChange={onChange}
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          {error ? <small style={{ color: '#dc2626' }}>{error}</small> : null}
        </form>
      </section>
    </div>
  )
}
