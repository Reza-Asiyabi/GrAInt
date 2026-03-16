const CONFIG = {
  draft:      { label: 'Draft',      classes: 'bg-slate-100 text-slate-600' },
  generating: { label: 'Generating', classes: 'bg-amber-100 text-amber-700' },
  complete:   { label: 'Complete',   classes: 'bg-emerald-100 text-emerald-700' },
  reviewed:   { label: 'Reviewed',   classes: 'bg-brand-100 text-brand-700' },
}

export default function StatusBadge({ status }) {
  const { label, classes } = CONFIG[status] ?? CONFIG.draft
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}
