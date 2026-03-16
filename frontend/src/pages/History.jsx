import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search, Trash2, FileText, AlertCircle } from 'lucide-react'
import { listProposals, deleteProposal } from '../api'
import StatusBadge from '../components/StatusBadge'

export default function History() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    listProposals()
      .then(data => { setProposals(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  async function handleDelete(e, id) {
    e.preventDefault()
    if (!window.confirm('Delete this proposal? This cannot be undone.')) return
    await deleteProposal(id)
    setProposals(prev => prev.filter(p => p.id !== id))
  }

  const filtered = proposals.filter(p =>
    !query || (p.title ?? '').toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">History</h1>
          <p className="text-slate-500 text-sm mt-0.5">All your generated proposals</p>
        </div>
        <Link to="/proposal/new" className="btn-primary text-sm">
          + New Proposal
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <AlertCircle size={18} className="text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <FileText size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            {query ? 'No proposals match your search.' : "You haven't generated any proposals yet."}
          </p>
          {!query && (
            <Link to="/proposal/new" className="btn-primary inline-flex mt-4 text-sm">
              Generate your first proposal
            </Link>
          )}
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map(p => {
            const date = new Date(p.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })
            return (
              <li key={p.id}>
                <Link
                  to={`/proposal/${p.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-5 py-4 hover:border-brand-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 transition-colors">
                      <FileText size={16} className="text-slate-400 group-hover:text-brand-500 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {p.title || 'Untitled proposal'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <StatusBadge status={p.status} />
                    <button
                      onClick={e => handleDelete(e, p.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
