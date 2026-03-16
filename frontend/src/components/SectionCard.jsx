import { useState } from 'react'
import { Pencil, Sparkles, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

export default function SectionCard({ section, label, content, onSave, onRevise, loading = false }) {
  const [mode, setMode] = useState('view')       // 'view' | 'edit' | 'revise'
  const [draft, setDraft] = useState(content)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Keep draft in sync if parent updates content (e.g., after revise)
  if (mode === 'view' && draft !== content) {
    setDraft(content)
  }

  async function handleSave() {
    setBusy(true)
    try {
      await onSave(draft)
      setMode('view')
    } finally {
      setBusy(false)
    }
  }

  async function handleRevise() {
    if (!feedback.trim()) return
    setBusy(true)
    try {
      await onRevise(feedback)
      setFeedback('')
      setMode('view')
    } finally {
      setBusy(false)
    }
  }

  function cancel() {
    setDraft(content)
    setFeedback('')
    setMode('view')
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all ${loading ? 'opacity-60' : 'fade-in'}`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin text-brand-500" />}
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            {label}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {mode === 'view' && !loading && (
            <>
              <button
                onClick={() => setCollapsed(c => !c)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              </button>
              <button
                onClick={() => { setDraft(content); setMode('edit') }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Edit manually"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setMode('revise')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 border border-brand-200 transition-colors"
                title="Revise with AI"
              >
                <Sparkles size={13} />
                AI Revise
              </button>
            </>
          )}

          {(mode === 'edit' || mode === 'revise') && (
            <button
              onClick={cancel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Cancel"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Card body */}
      {!collapsed && (
        <div className="px-5 py-4">
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-2.5">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-4/6" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          )}

          {/* View mode */}
          {!loading && mode === 'view' && (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {content || <span className="text-slate-400 italic">Not yet generated</span>}
            </p>
          )}

          {/* Edit mode */}
          {mode === 'edit' && (
            <div className="space-y-3">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={10}
                className="w-full text-sm text-slate-700 leading-relaxed border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-y"
              />
              <div className="flex justify-end gap-2">
                <button onClick={cancel} className="btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={busy} className="btn-primary">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Revise mode */}
          {mode === 'revise' && (
            <div className="space-y-3">
              {/* Show current content dimmed */}
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap border-l-2 border-slate-200 pl-3">
                {content}
              </p>
              <div className="bg-brand-50 rounded-lg p-4 space-y-3 border border-brand-100">
                <label className="block text-xs font-semibold text-brand-700 uppercase tracking-wide">
                  Feedback for AI
                </label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="e.g. Make this more concise and emphasise novelty. Add a stronger opening sentence."
                  rows={4}
                  className="w-full text-sm text-slate-700 border border-brand-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={cancel} className="btn-secondary">Cancel</button>
                  <button onClick={handleRevise} disabled={busy || !feedback.trim()} className="btn-primary">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Revise
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
