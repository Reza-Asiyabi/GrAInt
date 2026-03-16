import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import NewProposal from './pages/NewProposal'
import ProposalDetail from './pages/ProposalDetail'
import History from './pages/History'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/proposal/new" replace />} />
          <Route path="proposal/new" element={<NewProposal />} />
          <Route path="proposal/:id" element={<ProposalDetail />} />
          <Route path="history" element={<History />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
