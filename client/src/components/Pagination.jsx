/**
 * Reusable pagination bar.
 * Displays page numbers and prev/next controls.
 */
export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const maxVisible = 5
  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return (
    <div className="mt-4 flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink/60 hover:bg-canvas/70 disabled:opacity-30"
      >
        Prev
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink/60 hover:bg-canvas/70"
          >
            1
          </button>
          {start > 2 && <span className="px-1 text-ink/30">...</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            p === page
              ? 'bg-ink text-white shadow-sm'
              : 'text-ink/60 hover:bg-canvas/70'
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-ink/30">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink/60 hover:bg-canvas/70"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink/60 hover:bg-canvas/70 disabled:opacity-30"
      >
        Next
      </button>
    </div>
  )
}
