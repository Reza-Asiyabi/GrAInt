import { useEffect, useState } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { FilePlus, Clock, ChevronRight, Loader2 } from 'lucide-react'
import { listProposals } from '../api'

const STATUS_DOT = {
  draft:      'bg-slate-400',
  generating: 'bg-amber-400 animate-pulse',
  complete:   'bg-emerald-400',
  reviewed:   'bg-brand-400',
}

function SidebarLink({ to, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-slate-700 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`
      }
    >
      <Icon size={16} />
      {children}
    </NavLink>
  )
}

export default function Layout() {
  const location = useLocation()
  const [recent, setRecent] = useState([])

  useEffect(() => {
    listProposals()
      .then(data => setRecent(data.slice(0, 8)))
      .catch(() => {})
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-slate-950 flex flex-col">
        {/* Brand */}
        <div className="px-5 py-6 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <div>
              <p className="text-white font-semibold text-base leading-none">GrAInt</p>
              <p className="text-slate-500 text-xs mt-0.5">Grant Proposal AI</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1">
          <SidebarLink to="/proposal/new" icon={FilePlus}>New Proposal</SidebarLink>
          <SidebarLink to="/history" icon={Clock}>History</SidebarLink>
        </nav>

        {/* Recent proposals */}
        {recent.length > 0 && (
          <div className="px-3 mt-2 flex-1 overflow-y-auto sidebar-scroll">
            <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Recent
            </p>
            <ul className="space-y-0.5">
              {recent.map(p => (
                <li key={p.id}>
                  <Link
                    to={`/proposal/${p.id}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors group"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[p.status] ?? 'bg-slate-500'}`}
                    />
                    <span className="text-xs truncate flex-1">
                      {p.title || 'Untitled proposal'}
                    </span>
                    <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 mt-auto">
          <p className="text-slate-600 text-xs">Powered by GPT-4o-mini</p>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-slate-100">
        <Outlet />
      </main>
    </div>
  )
}
