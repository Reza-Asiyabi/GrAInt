import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Download, BookOpen, Loader2, AlertCircle, Trash2, ArrowLeft } from 'lucide-react'
import { getProposal, updateSection, reviseSection, reviewProposal, exportProposal, deleteProposal } from '../api'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'

const SECTION_ORDER = ['title', 'abstract', 'background', 'objectives', 'methodology', 'expected_outcomes']
const SECTION_LABELS = {
  title: 'Title',
  abstract: 'Abstract',
  background: 'Background',
  objectives: 'Objectives',
  methodology: 'Methodology',
  expected_outcomes: 'Expected Outcomes',
}

export default function ProposalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [proposal, setProposal] = useState(null)
  const [loadingReview, setLoadingReview] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    getProposal(id)
      .then(setProposal)
      .catch(err => setError(err.message))
  }, [id])

  async function handleSaveSection(section, content) {
    await updateSection(id, section, content)
    setProposal(prev => ({
      ...prev,
      sections: { ...prev.sections, [section]: content },
    }))
  }

  async function handleReviseSection(section, feedback) {
    const { content } = await reviseSection(id, section, feedback)
    setProposal(prev => ({
      ...prev,
      sections: { ...prev.sections, [section]: content },
    }))
  }

  async function handleReview() {
    setLoadingReview(true)
    setError('')
    try {
      const { review } = await reviewProposal(id)
      setProposal(prev => ({ ...prev, review, status: 'reviewed' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingReview(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this proposal? This cannot be undone.')) return
    await deleteProposal(id)
    navigate('/history')
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle size={18} className="text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  const title = proposal.title || 'Untitled Proposal'
  const date = new Date(proposal.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Top bar */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-snug">{title}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <StatusBadge status={proposal.status} />
              <span className="text-xs text-slate-400">{date}</span>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleReview}
            disabled={loadingReview}
            className="btn-secondary text-xs"
          >
            {loadingReview
              ? <Loader2 size={14} className="animate-spin" />
              : <BookOpen size={14} />}
            {loadingReview ? 'Reviewing…' : 'AI Review'}
          </button>

          <div className="relative group">
            <button className="btn-secondary text-xs">
              <Download size={14} />
              Export
            </button>
            {/* Dropdown */}
            <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1 hidden group-hover:block z-10">
              <button
                onClick={() => exportProposal(id, 'docx')}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Download DOCX
              </button>
              <button
                onClick={() => exportProposal(id, 'txt')}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Download TXT
              </button>
            </div>
          </div>

          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete proposal"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {SECTION_ORDER.map(section => (
          <SectionCard
            key={section}
            section={section}
            label={SECTION_LABELS[section]}
            content={proposal.sections[section] || ''}
            onSave={content => handleSaveSection(section, content)}
            onRevise={feedback => handleReviseSection(section, feedback)}
          />
        ))}
      </div>

      {/* Review card */}
      {proposal.review && (
        <div className="mt-4 bg-brand-50 rounded-xl border border-brand-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-brand-100">
            <h3 className="text-sm font-semibold text-brand-800 uppercase tracking-wide flex items-center gap-2">
              <BookOpen size={14} />
              AI Review
            </h3>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-brand-900 leading-relaxed whitespace-pre-wrap">
              {proposal.review}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
