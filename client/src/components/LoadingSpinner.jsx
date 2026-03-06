/**
 * Reusable loading indicator.
 * Renders a pulsing dot animation with an optional text message.
 * Use `fullPage` to centre it vertically in the viewport.
 */
export default function LoadingSpinner({ message = 'Loading...', fullPage = false }) {
  const inner = (
    <div className="flex items-center gap-3 text-ink/60">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-teal" />
      </span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        {inner}
      </div>
    )
  }

  return <div className="py-8 text-center flex justify-center">{inner}</div>
}
