import { useCommerce } from '../context/useCommerce.jsx'

export function HistoryPage() {
  const { history, currentStateName, cartItems, checkoutTimeline } = useCommerce()

  return (
    <section className="card">
      <div className="toolbar">
        <h2>History / Status</h2>
        <span className="status-chip">Current Cart State: {currentStateName}</span>
      </div>
      <p>Current cart item count: {cartItems.length}</p>
      <h3>Order Lifecycle Timeline</h3>
      {!checkoutTimeline.length ? (
        <p>No lifecycle events yet.</p>
      ) : (
        <div className="timeline">
          {checkoutTimeline.map((step) => (
            <div key={step.id} className="timeline-step">
              <div className="timeline-status">{step.status}</div>
              <small>{new Date(step.timestamp).toLocaleString()}</small>
              {step.reason ? <div>{step.reason}</div> : null}
            </div>
          ))}
        </div>
      )}
      <h3>Successful Checkout History</h3>
      {!history.length ? (
        <p>No successful checkouts yet.</p>
      ) : (
        history.map((entry) => (
          <article key={entry.id} className="history-item">
            <strong>{entry.id}</strong>
            <div>Date: {new Date(entry.createdAt).toLocaleString()}</div>
            <div>Total: ${entry.total.toFixed(2)}</div>
            <div>Items: {entry.items.length}</div>
            {entry.items.slice(0, 3).map((item) => (
              <div key={`${entry.id}-${item.id}`} className="history-product">
                <img src={item.image} alt={item.title} className="product-image tiny" />
                <span>
                  {item.title} x {item.quantity}
                </span>
              </div>
            ))}
          </article>
        ))
      )}
    </section>
  )
}
