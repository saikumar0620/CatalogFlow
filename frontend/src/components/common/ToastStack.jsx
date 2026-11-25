import Icon from './Icon'

export default function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-badge">
            <Icon
              name={toast.type === 'error' ? 'alert' : toast.type === 'info' ? 'refresh' : 'check'}
              size={14}
            />
          </span>
          <span className="toast-message">{toast.message}</span>
          <button
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
