import { useCommerce } from '../context/useCommerce.jsx'

export function OrdersPage() {
  const { history, removeOrder, clearOrders } = useCommerce()

  return (
    <section className="card">
      <div className="toolbar">
        <h2>Successful Orders</h2>
        <div className="toolbar-actions">
          <span>{history.length} orders</span>
          {history.length ? (
            <button type="button" className="btn btn-danger" onClick={clearOrders}>
              Clear all
            </button>
          ) : null}
        </div>
      </div>
      {!history.length ? (
        <p>No successful checkouts yet.</p>
      ) : (
        history.map((entry) => (
          <article key={entry.id} className="history-item">
            <strong>{entry.id}</strong>
            <div>Date: {new Date(entry.createdAt).toLocaleString()}</div>
            <div>Total: ${Number(entry.total ?? 0).toFixed(2)}</div>
            <div>Items: {entry.items?.length ?? 0}</div>
            {entry.note ? <div>Note: {entry.note}</div> : null}
            <button
              type="button"
              className="btn btn-danger btn-inline"
              onClick={() => removeOrder(entry.id)}
            >
              Delete order
            </button>
            {(entry.items ?? []).slice(0, 3).map((item) => (
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
