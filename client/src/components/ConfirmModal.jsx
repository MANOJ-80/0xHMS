import { useEffect, useRef } from 'react'

/**
 * Reusable confirmation dialog that replaces window.confirm().
 * Uses the native <dialog> element for accessibility.
 */
export default function ConfirmModal({
  open,
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
  children,
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!dialogRef.current) return
    if (open) {
      dialogRef.current.showModal()
    } else {
      dialogRef.current.close()
    }
  }, [open])

  const btnColor =
    variant === 'danger'
      ? 'bg-coral text-white hover:bg-coral/90'
      : variant === 'warning'
        ? 'bg-coral/80 text-white hover:bg-coral/70'
        : 'bg-ink text-white hover:bg-ink/90'

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="fixed inset-0 z-50 m-auto w-full max-w-sm rounded-2xl border border-white/50 bg-white p-0 shadow-panel backdrop:bg-ink/30 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        {message && <p className="mt-2 text-sm leading-6 text-ink/70">{message}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-medium text-ink/70 ring-1 ring-ink/10 hover:bg-canvas/70"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
