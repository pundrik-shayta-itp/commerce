export function NotificationList({ notifications, onDismiss }) {
  const getTypeMeta = (type) => {
    if (type === 'success') {
      return { icon: '✓', label: 'Success' }
    }
    if (type === 'error') {
      return { icon: '✕', label: 'Error' }
    }
    if (type === 'warn' || type === 'warning') {
      return { icon: '⚠', label: 'Warning' }
    }
    return { icon: 'ℹ', label: 'Info' }
  }

  return (
    <div className="toast-wrap" role="status" aria-live="polite" aria-atomic="false">
      {notifications.map((notification) => (
        <div key={notification.id} className={`toast toast-${notification.type}`}>
          <div className="toast-head">
            <strong>
              {getTypeMeta(notification.type).icon} {getTypeMeta(notification.type).label}
            </strong>
          </div>
          <div className="toast-message">{notification.message}</div>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(notification.id)}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )
}
