import { useCommerce } from '../context/useCommerce.jsx'

export function LifecyclePage() {
  const { checkoutTimeline, currentStateName, cartItems, performanceMetrics, removeTimelineLog, clearTimelineLogs } =
    useCommerce()
  const sortedTimeline = [...checkoutTimeline].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  )

  return (
    <section className="card">
      <div className="toolbar">
        <h2>Lifecycle Logs</h2>
        <div className="toolbar-actions">
          <span className="status-chip">State: {currentStateName}</span>
          {sortedTimeline.length ? (
            <button type="button" className="btn btn-danger" onClick={clearTimelineLogs}>
              Clear all
            </button>
          ) : null}
        </div>
      </div>
      <p>Current cart item count: {cartItems.length}</p>
      <div className="doc-panel">
        <strong>Stale Cart/Product Snapshot Handling</strong>
        <p>
          Checkout compares current cart checksum and state with persisted snapshot. If mismatch is
          found (cross-tab or tampering), checkout is blocked, timeline marks inconsistency, and
          cart rolls back to safe snapshot.
        </p>
      </div>
      <div className="metrics">
        <div className="metric-item">Product load: {performanceMetrics.productsLoadMs} ms</div>
        <div className="metric-item">
          Checkout validation: {performanceMetrics.checkoutValidationMs} ms
        </div>
        <div className="metric-item">
          Checkout submit trigger: {performanceMetrics.checkoutSubmissionMs} ms
        </div>
      </div>
      {!sortedTimeline.length ? (
        <p>No lifecycle events yet.</p>
      ) : (
        <div className="timeline">
          {sortedTimeline.map((step) => (
            <div key={step.id} className="timeline-step">
              <div className="timeline-status">{step.status}</div>
              <small>{new Date(step.timestamp).toLocaleString()}</small>
              {step.reason ? <div>{step.reason}</div> : null}
              <button
                type="button"
                className="btn btn-danger btn-inline"
                onClick={() => removeTimelineLog(step.id)}
              >
                Delete log
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
