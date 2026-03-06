export default function SectionCard({ title, eyebrow, children }) {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-panel backdrop-blur sm:p-6">
      <div className="mb-5">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-coral">{eyebrow}</p>
        ) : null}
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  )
}
