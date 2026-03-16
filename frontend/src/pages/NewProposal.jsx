import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { streamGenerate } from '../api'

const REQUIRED_FIELDS = [
  {
    key: 'topic',
    label: 'Research Topic',
    placeholder: 'e.g. AI-assisted early detection of neurodegenerative diseases using wearable sensors',
    rows: 3,
  },
  {
    key: 'objectives',
    label: 'Research Objectives',
    placeholder: 'What do you aim to achieve? List the key scientific and technical goals.',
    rows: 4,
  },
  {
    key: 'methods',
    label: 'Methodology',
    placeholder: 'Describe your research approach — data, tools, techniques, and innovations.',
    rows: 4,
  },
  {
    key: 'impact',
    label: 'Expected Impact',
    placeholder: 'What difference will this research make? Consider scientific, societal, and policy relevance.',
    rows: 3,
  },
  {
    key: 'call_information',
    label: 'Grant Call Information',
    placeholder: 'Paste key details from the funding call — priorities, themes, eligibility, word limits, deadlines.',
    rows: 4,
  },
]

const OPTIONAL_FIELDS = [
  { key: 'references',   label: 'Key References',   placeholder: 'Relevant papers, prior work, or datasets', rows: 3 },
  { key: 'constraints',  label: 'Constraints',       placeholder: 'Budget limits, team size, institutional requirements', rows: 2 },
  { key: 'timeline',     label: 'Project Timeline',  placeholder: 'e.g. 3 years', rows: 1 },
  { key: 'budget_range', label: 'Budget Range',      placeholder: 'e.g. £500k – £1M', rows: 1 },
]

const SECTION_LABELS = {
  title: 'Title',
  abstract: 'Abstract',
  background: 'Background',
  objectives: 'Objectives',
  methodology: 'Methodology',
  expected_outcomes: 'Expected Outcomes',
}

const SECTION_ORDER = ['title', 'abstract', 'background', 'objectives', 'methodology', 'expected_outcomes']

// ─── Generating view ──────────────────────────────────────────────────────────

function GeneratingView({ sections, sectionStates, proposalId, onViewProposal }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Generating your proposal…</h1>
        </div>
        <p className="text-slate-500 text-sm ml-12">
          Sections are generated sequentially so each one builds on the last.
        </p>
      </div>

      {/* Section progress */}
      <div className="space-y-4">
        {SECTION_ORDER.map(section => {
          const state = sectionStates[section] // 'pending' | 'loading' | 'done' | 'error'
          const content = sections[section]

          return (
            <div
              key={section}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${
                state === 'pending' ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
                <span className="flex-shrink-0">
                  {state === 'done' && <CheckCircle2 size={16} className="text-emerald-500" />}
                  {state === 'loading' && <Loader2 size={16} className="animate-spin text-brand-500" />}
                  {state === 'error' && <AlertCircle size={16} className="text-red-500" />}
                  {state === 'pending' && (
                    <span className="w-4 h-4 rounded-full border-2 border-slate-300 block" />
                  )}
                </span>
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                  {SECTION_LABELS[section]}
                </h3>
              </div>

              <div className="px-5 py-4">
                {state === 'pending' && (
                  <div className="space-y-2">
                    <div className="skeleton h-3 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                )}
                {state === 'loading' && (
                  <div className="space-y-2.5 animate-pulse">
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-5/6" />
                    <div className="skeleton h-4 w-4/6" />
                  </div>
                )}
                {(state === 'done' || state === 'error') && (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap fade-in">
                    {content}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Done CTA */}
      {proposalId && Object.values(sectionStates).every(s => s === 'done' || s === 'error') && (
        <div className="mt-8 flex justify-center fade-in">
          <button onClick={onViewProposal} className="btn-primary px-6 py-3 text-base">
            <CheckCircle2 size={18} />
            View &amp; Edit Full Proposal
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewProposal() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState(
    Object.fromEntries([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(f => [f.key, '']))
  )
  const [showOptional, setShowOptional] = useState(false)
  const [error, setError] = useState('')

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [sections, setSections] = useState({})
  const [sectionStates, setSectionStates] = useState(
    Object.fromEntries(SECTION_ORDER.map(s => [s, 'pending']))
  )
  const [proposalId, setProposalId] = useState(null)

  function set(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const requiredFilled = REQUIRED_FIELDS.every(f => formData[f.key].trim())

  async function handleGenerate() {
    setError('')
    setGenerating(true)
    setSections({})
    setSectionStates(Object.fromEntries(SECTION_ORDER.map(s => [s, 'pending'])))
    setProposalId(null)

    // Mark first section as loading immediately
    setSectionStates(prev => ({ ...prev, [SECTION_ORDER[0]]: 'loading' }))

    try {
      await streamGenerate(formData, event => {
        if (event.event === 'start') {
          setProposalId(event.proposal_id)
        }

        if (event.event === 'section') {
          const { section, content } = event
          setSections(prev => ({ ...prev, [section]: content }))
          setSectionStates(prev => {
            const next = { ...prev, [section]: 'done' }
            // Mark the next section as loading
            const idx = SECTION_ORDER.indexOf(section)
            if (idx + 1 < SECTION_ORDER.length) {
              next[SECTION_ORDER[idx + 1]] = 'loading'
            }
            return next
          })
        }

        if (event.event === 'error') {
          setSectionStates(prev => ({ ...prev, [event.section]: 'error' }))
          setSections(prev => ({ ...prev, [event.section]: `⚠ ${event.message}` }))
        }
      })
    } catch (err) {
      setError(err.message)
      setGenerating(false)
    }
  }

  function handleViewProposal() {
    navigate(`/proposal/${proposalId}`)
  }

  // ── Generating view ──
  if (generating) {
    return (
      <GeneratingView
        sections={sections}
        sectionStates={sectionStates}
        proposalId={proposalId}
        onViewProposal={handleViewProposal}
      />
    )
  }

  // ── Form view ──
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">New Proposal</h1>
        <p className="text-slate-500 text-sm mt-1">
          Fill in the fields below and GrAInt will draft all six sections of your grant proposal.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-5">
        {/* Required fields */}
        {REQUIRED_FIELDS.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {field.label}
              <span className="text-red-400 ml-1">*</span>
            </label>
            <textarea
              value={formData[field.key]}
              onChange={e => set(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={field.rows}
              className="input-field resize-none"
            />
          </div>
        ))}

        {/* Optional fields toggle */}
        <button
          type="button"
          onClick={() => setShowOptional(v => !v)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          {showOptional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showOptional ? 'Hide' : 'Show'} optional fields
        </button>

        {showOptional && (
          <div className="space-y-5 bg-slate-50 rounded-xl p-5 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Optional — helps the AI produce more tailored content
            </p>
            {OPTIONAL_FIELDS.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {field.label}
                </label>
                <textarea
                  value={formData[field.key]}
                  onChange={e => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={field.rows}
                  className="input-field resize-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <div className="pt-2">
          <button
            onClick={handleGenerate}
            disabled={!requiredFilled}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            <Sparkles size={18} />
            Generate Proposal
          </button>
          {!requiredFilled && (
            <p className="text-xs text-slate-400 text-center mt-2">
              Please fill in all required fields to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
