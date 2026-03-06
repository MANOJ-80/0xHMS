const TONE_MAP = {
  // Queue / consultation statuses
  waiting: 'bg-teal/10 text-teal',
  in_consultation: 'bg-coral/10 text-coral',
  completed: 'bg-moss/10 text-moss',
  missed: 'bg-ink/10 text-ink/60',
  checked_out: 'bg-ink/10 text-ink/60',

  // Appointment statuses
  scheduled: 'bg-teal/10 text-teal',
  cancelled: 'bg-coral/10 text-coral',
  no_show: 'bg-ink/10 text-ink/60',

  // Doctor availability
  available: 'bg-moss/10 text-moss',
  busy: 'bg-coral/10 text-coral',
  offline: 'bg-ink/10 text-ink/60',
  on_break: 'bg-sand/30 text-ink/60',

  // Patient active status
  active: 'bg-moss/10 text-moss',
  inactive: 'bg-coral/10 text-coral',

  // Priority
  normal: 'bg-teal/10 text-teal',
  urgent: 'bg-coral/10 text-coral',

  // Generic fallback
  default: 'bg-ink/10 text-ink/60',
}

/**
 * Consistent status badge used across all pages.
 * Accepts a `status` string that maps to a preset colour tone,
 * or an explicit `tone` override (a Tailwind class string).
 */
export default function StatusBadge({ status, label, tone, className = '' }) {
  const resolved = tone || TONE_MAP[status] || TONE_MAP.default
  const display = label || (status ? status.replace(/_/g, ' ') : '')

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${resolved} ${className}`}
    >
      {display}
    </span>
  )
}
