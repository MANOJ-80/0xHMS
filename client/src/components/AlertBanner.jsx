const VARIANT = {
  error: 'bg-coral/10 text-coral',
  success: 'bg-moss/10 text-moss',
  info: 'bg-teal/10 text-teal',
  warning: 'bg-sand/40 text-ink/80',
}

/**
 * Dismissible alert banner for inline feedback.
 * @param {string} variant  - "error" | "success" | "info" | "warning"
 * @param {string} message  - Text to display
 * @param {function} onDismiss - Optional callback to clear the message
 */
export default function AlertBanner({ variant = 'error', message, onDismiss, className = '' }) {
  if (!message) return null

  const tone = VARIANT[variant] || VARIANT.error

  return (
    <div className={`mb-4 flex items-center justify-between rounded-2xl p-4 text-sm ${tone} ${className}`}>
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-4 text-current opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          &times;
        </button>
      )}
    </div>
  )
}
