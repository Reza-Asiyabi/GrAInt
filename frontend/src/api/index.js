const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  return res
}

export async function listProposals() {
  const res = await request('/proposals')
  return res.json()
}

export async function getProposal(id) {
  const res = await request(`/proposals/${id}`)
  return res.json()
}

export async function deleteProposal(id) {
  await request(`/proposals/${id}`, { method: 'DELETE' })
}

export async function updateSection(id, section, content) {
  await request(`/proposals/${id}/sections/${section}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
}

export async function reviseSection(id, section, feedback) {
  const res = await request(`/proposals/${id}/sections/${section}/revise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback }),
  })
  return res.json() // { content: string }
}

export async function reviewProposal(id) {
  const res = await request(`/proposals/${id}/review`, { method: 'POST' })
  return res.json() // { review: string }
}

export function exportProposal(id, format) {
  window.open(`${BASE}/proposals/${id}/export?format=${format}`, '_blank')
}

/**
 * Stream proposal generation via SSE-over-fetch.
 * onEvent is called with each parsed event object.
 */
export async function streamGenerate(inputs, onEvent) {
  const res = await fetch(`${BASE}/proposals/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Generation failed')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // Keep any incomplete trailing line

    for (const line of lines) {
      if (line.startsWith('data: ') && line.length > 6) {
        try {
          onEvent(JSON.parse(line.slice(6)))
        } catch {
          // Skip malformed events
        }
      }
    }
  }
}
