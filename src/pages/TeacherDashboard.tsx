import React, { useState, useEffect, useCallback } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase, Session, AttendanceRecord } from '../lib/supabase'

/*
  INSTALL DEPENDENCY FIRST:
  npm install qrcode.react
*/

// ── Excel/CSV download (now includes Photo URL column) ──
function downloadExcel(sessionName: string, records: AttendanceRecord[]) {
  const headers = ['#', 'Student Name', 'Submitted At', 'IP Address', 'Device ID', 'Photo URL']
  const rows = records.map((r, i) => [
    i + 1,
    r.student_name,
    new Date(r.submitted_at).toLocaleString(),
    r.ip_address,
    r.device_fingerprint,
    r.photo_url ?? '',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sessionName.replace(/\s+/g, '_')}_attendance.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Download a photo via blob (works for cross-origin Supabase URLs) ──
async function downloadPhoto(url: string, studentName: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const ext = blob.type.split('/')[1] ?? 'jpg'
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `${studentName.replace(/\s+/g, '_')}_photo.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  } catch {
    // Fallback: open in new tab
    window.open(url, '_blank')
  }
}

// ── Download QR as PNG ──
function downloadQR(sessionName: string, canvasId: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null
  if (!canvas) return
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = `${sessionName.replace(/\s+/g, '_')}_QR.png`
  a.click()
}

// ── Styles ──
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #1a1a24;
    --border: rgba(255,255,255,0.07);
    --border-hover: rgba(255,255,255,0.15);
    --text: #f0f0f8;
    --muted: #6b6b8a;
    --accent: #7c6cfc;
    --accent2: #fc6c8f;
    --green: #4ade80;
    --yellow: #fbbf24;
    --red: #f87171;
    --font: 'Syne', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
  @keyframes popIn {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
  }

  .dash { min-height: 100vh; padding: 0 0 80px; }

  .header {
    padding: 28px 40px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; background: rgba(10,10,15,0.88);
    backdrop-filter: blur(14px); z-index: 100;
  }
  .logo {
    font-size: 18px; font-weight: 800; letter-spacing: -0.03em;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .badge {
    font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    padding: 4px 10px; border-radius: 20px;
    background: rgba(124,108,252,0.12); color: var(--accent); border: 1px solid rgba(124,108,252,0.25);
  }

  .main { display: grid; grid-template-columns: 320px 1fr; min-height: calc(100vh - 77px); }

  .sidebar {
    border-right: 1px solid var(--border);
    padding: 28px 20px;
    display: flex; flex-direction: column; gap: 18px;
    overflow-y: auto;
  }
  .sidebar-title {
    font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: var(--muted); padding: 0 4px;
  }
  .new-form { display: flex; flex-direction: column; gap: 9px; }
  .new-form input {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 11px 14px; color: var(--text);
    font-family: var(--font); font-size: 13px; outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .new-form input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(124,108,252,0.15);
  }
  .btn-create {
    background: linear-gradient(135deg, var(--accent), #9c6cfc);
    color: #fff; border: none; border-radius: 10px; padding: 12px;
    font-family: var(--font); font-size: 13px; font-weight: 700;
    cursor: pointer; transition: opacity .2s;
  }
  .btn-create:hover { opacity: .85; }
  .btn-create:disabled { opacity: .4; cursor: not-allowed; }

  .session-list { display: flex; flex-direction: column; gap: 7px; }
  .session-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 13px 15px; cursor: pointer;
    transition: border-color .2s, background .2s;
    animation: fadeUp .3s ease both;
  }
  .session-card:hover { border-color: var(--border-hover); background: var(--surface2); }
  .session-card.active { border-color: var(--accent); background: rgba(124,108,252,0.07); }
  .sc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; }
  .sc-name { font-size: 13px; font-weight: 700; }
  .sc-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--green); box-shadow: 0 0 6px var(--green);
    animation: pulse 2s ease-in-out infinite; flex-shrink: 0;
  }
  .sc-dot.closed { background: var(--muted); box-shadow: none; animation: none; }
  .sc-meta { font-size: 11px; color: var(--muted); font-family: var(--mono); }

  .detail { padding: 32px 40px; overflow-y: auto; }
  .detail-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 24px; gap: 20px; flex-wrap: wrap;
  }
  .detail-title { font-size: 24px; font-weight: 800; letter-spacing: -.02em; margin-bottom: 5px; }
  .detail-meta { font-size: 12px; color: var(--muted); font-family: var(--mono); }
  .detail-actions { display: flex; gap: 9px; flex-wrap: wrap; }

  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 15px; border-radius: 10px; font-family: var(--font);
    font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid transparent;
    transition: opacity .2s;
  }
  .btn:hover { opacity: .8; }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn-close  { background: rgba(251,191,36,0.1);  color: var(--yellow); border-color: rgba(251,191,36,0.25); }
  .btn-open   { background: rgba(74,222,128,0.1);  color: var(--green);  border-color: rgba(74,222,128,0.25); }
  .btn-dl     { background: rgba(124,108,252,0.1); color: var(--accent); border-color: rgba(124,108,252,0.25); }
  .btn-delete { background: rgba(248,113,113,0.1); color: var(--red);    border-color: rgba(248,113,113,0.25); }
  .btn-qr     { background: rgba(74,222,128,0.1);  color: var(--green);  border-color: rgba(74,222,128,0.25); }

  /* ── QR + link panel ── */
  .qr-link-row {
    display: grid; grid-template-columns: auto 1fr; gap: 24px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 22px 26px; margin-bottom: 24px;
    align-items: center;
  }
  .qr-block { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .qr-label {
    font-size: 10px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; color: var(--muted);
  }
  .qr-canvas-wrap {
    background: #fff; border-radius: 12px; padding: 10px;
    animation: popIn .4s cubic-bezier(0.34,1.56,0.64,1);
    cursor: pointer; transition: transform .2s, box-shadow .2s;
  }
  .qr-canvas-wrap:hover {
    transform: scale(1.04);
    box-shadow: 0 0 0 4px rgba(124,108,252,0.3);
  }
  .qr-hint-small { font-size: 10px; color: var(--muted); text-align: center; }
  .qr-download {
    background: rgba(124,108,252,0.12); color: var(--accent);
    border: 1px solid rgba(124,108,252,0.25); border-radius: 7px;
    padding: 5px 12px; font-family: var(--font); font-size: 11px;
    font-weight: 700; cursor: pointer; transition: opacity .2s;
  }
  .qr-download:hover { opacity: .75; }

  .link-col { display: flex; flex-direction: column; gap: 10px; }
  .link-col-title {
    font-size: 10px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--muted);
  }
  .link-url {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 9px; padding: 10px 14px;
    font-family: var(--mono); font-size: 11px; color: var(--muted);
    word-break: break-all; line-height: 1.5;
  }
  .btn-copy {
    align-self: flex-start;
    background: rgba(124,108,252,0.1); color: var(--accent);
    border: 1px solid rgba(124,108,252,0.25); border-radius: 7px;
    padding: 7px 14px; font-family: var(--font); font-size: 12px;
    font-weight: 700; cursor: pointer; transition: opacity .2s;
  }
  .btn-copy:hover { opacity: .75; }
  .qr-info {
    font-size: 12px; color: var(--muted); line-height: 1.6;
    background: rgba(74,222,128,0.05); border: 1px solid rgba(74,222,128,0.12);
    border-radius: 8px; padding: 10px 14px;
  }

  .stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat-box {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 14px 20px; flex: 1; min-width: 110px;
  }
  .stat-val { font-size: 26px; font-weight: 800; letter-spacing: -.03em; }
  .stat-lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .1em; margin-top: 3px; }

  /* ── Attendance table with photo column ── */
  .table-wrap {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden;
  }
  .table-head {
    display: grid; grid-template-columns: 44px 56px 1fr 150px 110px;
    padding: 11px 20px; border-bottom: 1px solid var(--border);
    font-size: 10px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--muted);
  }
  .table-row {
    display: grid; grid-template-columns: 44px 56px 1fr 150px 110px;
    padding: 10px 20px; border-bottom: 1px solid var(--border);
    font-size: 13px; align-items: center;
    transition: background .15s; animation: fadeUp .2s ease both;
  }
  .table-row:last-child { border-bottom: none; }
  .table-row:hover { background: var(--surface2); }
  .row-num  { color: var(--muted); font-family: var(--mono); font-size: 12px; }
  .row-photo { display: flex; align-items: center; }
  .row-name { font-weight: 600; }
  .row-time { font-family: var(--mono); font-size: 11px; color: var(--muted); }
  .row-ip   { font-family: var(--mono); font-size: 11px; color: var(--muted); }

  /* Photo thumbnail */
  .photo-thumb {
    width: 36px; height: 36px; border-radius: 8px; object-fit: cover;
    border: 1px solid var(--border); cursor: zoom-in;
    transition: transform .15s, box-shadow .15s;
  }
  .photo-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 0 0 3px rgba(124,108,252,0.35);
  }
  .no-photo {
    width: 36px; height: 36px; border-radius: 8px;
    background: var(--surface2); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: var(--muted);
  }
  .btn-dl-photo {
    display: inline-flex; align-items: center; gap: 4px;
    background: rgba(74,222,128,0.08); color: var(--green);
    border: 1px solid rgba(74,222,128,0.22); border-radius: 6px;
    padding: 4px 9px; font-family: var(--font); font-size: 11px;
    font-weight: 700; cursor: pointer; text-decoration: none;
    transition: opacity .2s;
  }
  .btn-dl-photo:hover { opacity: .75; }

  .empty {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 60px 20px; color: var(--muted);
    text-align: center; gap: 12px;
  }
  .empty-icon { font-size: 40px; }
  .empty-text { font-size: 14px; }
  .spinner {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid var(--border); border-top-color: var(--accent);
    animation: spin .7s linear infinite;
  }

  /* ── QR fullscreen modal ── */
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.82);
    display: flex; align-items: center; justify-content: center;
    z-index: 999; backdrop-filter: blur(8px);
  }
  .qr-modal-box {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 24px; padding: 44px 40px; max-width: 420px; width: 92%;
    text-align: center; animation: popIn .35s cubic-bezier(0.34,1.56,0.64,1);
    display: flex; flex-direction: column; align-items: center; gap: 16px;
  }
  .qr-modal-title { font-size: 20px; font-weight: 800; }
  .qr-modal-sub   { font-size: 12px; color: var(--muted); font-family: var(--mono); }
  .qr-modal-canvas { background: #fff; border-radius: 16px; padding: 18px; }
  .qr-modal-scan-hint {
    font-size: 13px; color: var(--muted);
    background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.14);
    border-radius: 8px; padding: 10px 16px; line-height: 1.5;
  }
  .qr-modal-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

  /* ── Photo lightbox ── */
  .photo-lightbox {
    position: fixed; inset: 0; background: rgba(0,0,0,0.92);
    display: flex; align-items: center; justify-content: center;
    z-index: 1100; backdrop-filter: blur(10px);
    cursor: zoom-out;
  }
  .photo-lightbox img {
    max-width: 90vw; max-height: 85vh;
    border-radius: 14px; object-fit: contain;
    box-shadow: 0 12px 60px rgba(0,0,0,0.7);
    animation: popIn .25s ease;
    cursor: default;
  }
  .lightbox-close {
    position: absolute; top: 20px; right: 24px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; width: 36px; height: 36px; color: var(--text);
    font-size: 18px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .lightbox-dl {
    position: absolute; bottom: 24px;
    background: var(--accent); color: #fff; border: none;
    border-radius: 10px; padding: 10px 20px;
    font-family: var(--font); font-size: 13px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; gap: 6px;
    text-decoration: none;
  }

  /* ── delete confirm ── */
  .confirm-box {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; padding: 36px; max-width: 380px; width: 90%;
    text-align: center; animation: fadeUp .25s ease;
  }
  .confirm-icon  { font-size: 44px; margin-bottom: 16px; }
  .confirm-title { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
  .confirm-sub   { font-size: 13px; color: var(--muted); margin-bottom: 28px; line-height: 1.6; }
  .confirm-btns  { display: flex; gap: 10px; justify-content: center; }
  .btn-cancel      { background: var(--surface2); color: var(--text); border: 1px solid var(--border); padding: 11px 22px; border-radius: 10px; font-family: var(--font); font-size: 14px; font-weight: 700; cursor: pointer; }
  .btn-confirm-del { background: var(--red); color: #fff; border: none; padding: 11px 22px; border-radius: 10px; font-family: var(--font); font-size: 14px; font-weight: 700; cursor: pointer; }

  .toast {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 12px; padding: 14px 20px;
    font-size: 13px; font-weight: 600;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: fadeUp .3s ease;
  }
  .toast.ok  { border-color: rgba(74,222,128,0.4); color: var(--green); }
  .toast.err { border-color: rgba(248,113,113,0.4); color: var(--red); }

  @media (max-width: 820px) {
    .main { grid-template-columns: 1fr; }
    .sidebar { border-right: none; border-bottom: 1px solid var(--border); max-height: 320px; }
    .header { padding: 18px 20px; }
    .detail { padding: 24px 20px; }
    .qr-link-row { grid-template-columns: 1fr; justify-items: center; }
    .link-col { width: 100%; }
    .table-head, .table-row { grid-template-columns: 36px 44px 1fr 130px; }
    .row-ip { display: none; }
  }
`

function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  return <div className={`toast ${type}`}>{type === 'ok' ? '✓ ' : '✗ '}{msg}</div>
}

/* ── Photo Lightbox ── */
function PhotoLightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="photo-lightbox" onClick={onClose}>
      <img src={url} alt={name} onClick={e => e.stopPropagation()} />
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <button
        className="lightbox-dl"
        onClick={e => { e.stopPropagation(); downloadPhoto(url, name) }}
      >
        ⬇ Download Photo
      </button>
    </div>
  )
}

export default function TeacherDashboard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selected, setSelected] = useState<Session | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [newName, setNewName] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Session | null>(null)
  const [qrModal, setQrModal] = useState(false)

  // ── Photo lightbox state
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const sessionLink = (id: string) => `${window.location.origin}/attend?session=${id}`

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true)
    const { data, error } = await supabase
      .from('sessions').select('*').order('created_at', { ascending: false })
    if (!error && data) setSessions(data as Session[])
    setLoadingSessions(false)
  }, [])

  const loadAttendance = useCallback(async (sessionId: string) => {
    setLoadingAttendance(true)
    const { data, error } = await supabase
      .from('attendance').select('*')
      .eq('session_id', sessionId)
      .order('submitted_at', { ascending: true })
    if (!error && data) setAttendance(data as AttendanceRecord[])
    setLoadingAttendance(false)
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  useEffect(() => {
    if (!selected) return
    loadAttendance(selected.id)
    const channel = supabase
      .channel(`attendance:${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'attendance',
        filter: `session_id=eq.${selected.id}`,
      }, payload => {
        setAttendance(prev => [...prev, payload.new as AttendanceRecord])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected, loadAttendance])

  const createSession = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('sessions')
      .insert({ name: newName.trim(), created_by: createdBy.trim() || 'Teacher' })
      .select().single()
    if (error) {
      showToast('Failed to create session', 'err')
    } else {
      setSessions(prev => [data as Session, ...prev])
      setSelected(data as Session)
      setNewName('')
      showToast('Session created!')
    }
    setCreating(false)
  }

  const toggleSession = async (session: Session) => {
    const { error } = await supabase
      .from('sessions').update({ is_active: !session.is_active }).eq('id', session.id)
    if (error) { showToast('Update failed', 'err'); return }
    const updated = { ...session, is_active: !session.is_active }
    setSessions(prev => prev.map(s => s.id === session.id ? updated : s))
    if (selected?.id === session.id) setSelected(updated)
    showToast(updated.is_active ? 'Session opened' : 'Session closed')
  }

  const deleteSession = async (session: Session) => {
    const { error } = await supabase.from('sessions').delete().eq('id', session.id)
    if (error) { showToast('Delete failed', 'err'); setConfirmDelete(null); return }
    setSessions(prev => prev.filter(s => s.id !== session.id))
    if (selected?.id === session.id) { setSelected(null); setAttendance([]) }
    setConfirmDelete(null)
    showToast('Session deleted')
  }

  // ── Photo count badge
  const photoCount = attendance.filter(r => r.photo_url).length

  return (
    <>
      <style>{css}</style>
      <div className="dash">

        {/* Header */}
        <header className="header">
          <div className="logo">AttendAI</div>
          <span className="badge">Teacher Dashboard</span>
        </header>

        <div className="main">

          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-title">New Session</div>
            <div className="new-form">
              <input
                placeholder="Session name (e.g. Math – Week 3)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createSession()}
              />
              <input
                placeholder="Your name (optional)"
                value={createdBy}
                onChange={e => setCreatedBy(e.target.value)}
              />
              <button className="btn-create" onClick={createSession} disabled={creating || !newName.trim()}>
                {creating ? 'Creating…' : '+ Create Session'}
              </button>
            </div>

            <div className="sidebar-title" style={{ marginTop: 4 }}>
              Sessions ({sessions.length})
            </div>

            <div className="session-list">
              {loadingSessions ? (
                <div className="empty"><div className="spinner" /></div>
              ) : sessions.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📋</div>
                  <div className="empty-text">No sessions yet</div>
                </div>
              ) : sessions.map((s, i) => (
                <div
                  key={s.id}
                  className={`session-card ${selected?.id === s.id ? 'active' : ''}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => setSelected(s)}
                >
                  <div className="sc-top">
                    <div className="sc-name">{s.name}</div>
                    <div className={`sc-dot ${s.is_active ? '' : 'closed'}`} />
                  </div>
                  <div className="sc-meta">
                    {s.is_active ? 'Active' : 'Closed'} · {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Detail Pane */}
          <main className="detail">
            {!selected ? (
              <div className="empty" style={{ paddingTop: 100 }}>
                <div className="empty-icon">👈</div>
                <div className="empty-text">Select or create a session to get started</div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="detail-header">
                  <div>
                    <div className="detail-title">{selected.name}</div>
                    <div className="detail-meta">
                      Created by {selected.created_by} · {new Date(selected.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="detail-actions">
                    <button
                      className={`btn ${selected.is_active ? 'btn-close' : 'btn-open'}`}
                      onClick={() => toggleSession(selected)}
                    >
                      {selected.is_active ? '🔒 Close' : '🔓 Open'}
                    </button>
                    <button className="btn btn-qr" onClick={() => setQrModal(true)}>
                      📲 Full QR
                    </button>
                    <button
                      className="btn btn-dl"
                      onClick={() => downloadExcel(selected.name, attendance)}
                      disabled={attendance.length === 0}
                    >
                      ⬇ Excel
                    </button>
                    <button className="btn btn-delete" onClick={() => setConfirmDelete(selected)}>
                      🗑 Delete
                    </button>
                  </div>
                </div>

                {/* QR + Link panel */}
                <div className="qr-link-row">
                  <div className="qr-block">
                    <div className="qr-label">Scan to Attend</div>
                    <div className="qr-canvas-wrap" onClick={() => setQrModal(true)} title="Click to enlarge">
                      <QRCodeCanvas
                        id={`qr-inline-${selected.id}`}
                        value={sessionLink(selected.id)}
                        size={130}
                        bgColor="#ffffff"
                        fgColor="#0a0a0f"
                        level="M"
                      />
                    </div>
                    <div className="qr-hint-small">Click to enlarge</div>
                    <button
                      className="qr-download"
                      onClick={() => downloadQR(selected.name, `qr-inline-${selected.id}`)}
                    >
                      ⬇ Download PNG
                    </button>
                  </div>

                  <div className="link-col">
                    <div className="link-col-title">Attendance Link</div>
                    <div className="link-url">{sessionLink(selected.id)}</div>
                    <button
                      className="btn-copy"
                      onClick={() => {
                        navigator.clipboard.writeText(sessionLink(selected.id))
                        showToast('Link copied!')
                      }}
                    >
                      📋 Copy Link
                    </button>
                    <div className="qr-info">
                      📲 Show this QR on your projector or screen. Students scan it with their phone camera — no app needed. The form opens instantly.
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="stats">
                  <div className="stat-box">
                    <div className="stat-val" style={{ color: 'var(--accent)' }}>{attendance.length}</div>
                    <div className="stat-lbl">Students Present</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-val" style={{ color: selected.is_active ? 'var(--green)' : 'var(--muted)' }}>
                      {selected.is_active ? 'Open' : 'Closed'}
                    </div>
                    <div className="stat-lbl">Session Status</div>
                  </div>
                  {photoCount > 0 && (
                    <div className="stat-box">
                      <div className="stat-val" style={{ color: 'var(--accent)', fontSize: 22 }}>📷 {photoCount}</div>
                      <div className="stat-lbl">Photos Submitted</div>
                    </div>
                  )}
                  {attendance.length > 0 && (
                    <div className="stat-box">
                      <div className="stat-val" style={{ color: 'var(--yellow)', fontSize: 15, paddingTop: 7 }}>
                        {new Date(attendance[attendance.length - 1].submitted_at).toLocaleTimeString()}
                      </div>
                      <div className="stat-lbl">Last Submission</div>
                    </div>
                  )}
                </div>

                {/* Attendance table */}
                {loadingAttendance ? (
                  <div className="empty"><div className="spinner" /></div>
                ) : attendance.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">🎓</div>
                    <div className="empty-text">No submissions yet — show the QR above to students.</div>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <div className="table-head">
                      <div>#</div>
                      <div>Photo</div>
                      <div>Student Name</div>
                      <div>Time</div>
                      <div>IP Address</div>
                    </div>
                    {attendance.map((r, i) => (
                      <div className="table-row" key={r.id} style={{ animationDelay: `${i * 25}ms` }}>
                        <div className="row-num">{i + 1}</div>

                        {/* ── Photo cell ── */}
                        <div className="row-photo">
                          {r.photo_url ? (
                            <img
                              className="photo-thumb"
                              src={r.photo_url}
                              alt={r.student_name}
                              title="Click to enlarge"
                              onClick={() => setLightbox({ url: r.photo_url!, name: r.student_name })}
                            />
                          ) : (
                            <div className="no-photo" title="No photo">—</div>
                          )}
                        </div>

                        <div className="row-name">
                          {r.student_name}
                          {r.photo_url && (
                            <button
                              className="btn-dl-photo"
                              onClick={() => downloadPhoto(r.photo_url!, r.student_name)}
                              style={{ marginLeft: 8 }}
                            >
                              ⬇ Photo
                            </button>
                          )}
                        </div>

                        <div className="row-time">{new Date(r.submitted_at).toLocaleTimeString()}</div>
                        <div className="row-ip">{r.ip_address}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>

        {/* ── QR Fullscreen Modal ── */}
        {qrModal && selected && (
          <div className="overlay" onClick={() => setQrModal(false)}>
            <div className="qr-modal-box" onClick={e => e.stopPropagation()}>
              <div className="qr-modal-title">{selected.name}</div>
              <div className="qr-modal-sub">Point your phone camera at the code below</div>
              <div className="qr-modal-canvas">
                <QRCodeCanvas
                  id={`qr-modal-${selected.id}`}
                  value={sessionLink(selected.id)}
                  size={270}
                  bgColor="#ffffff"
                  fgColor="#0a0a0f"
                  level="M"
                />
              </div>
              <div className="qr-modal-scan-hint">
                📱 Works with any phone camera app — no QR scanner needed.<br />
                The attendance form opens automatically.
              </div>
              <div className="qr-modal-actions">
                <button
                  className="btn btn-dl"
                  onClick={() => { downloadQR(selected.name, `qr-modal-${selected.id}`); showToast('QR downloaded!') }}
                >
                  ⬇ Download PNG
                </button>
                <button
                  className="btn"
                  style={{ background: 'var(--surface2)', color: 'var(--muted)', borderColor: 'var(--border)' }}
                  onClick={() => setQrModal(false)}
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Photo Lightbox ── */}
        {lightbox && (
          <PhotoLightbox
            url={lightbox.url}
            name={lightbox.name}
            onClose={() => setLightbox(null)}
          />
        )}

        {/* ── Delete Confirm ── */}
        {confirmDelete && (
          <div className="overlay" onClick={() => setConfirmDelete(null)}>
            <div className="confirm-box" onClick={e => e.stopPropagation()}>
              <div className="confirm-icon">🗑</div>
              <div className="confirm-title">Delete Session?</div>
              <div className="confirm-sub">
                "<strong>{confirmDelete.name}</strong>" and all {attendance.length} attendance
                record{attendance.length !== 1 ? 's' : ''} will be permanently deleted. This cannot be undone.
              </div>
              <div className="confirm-btns">
                <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn-confirm-del" onClick={() => deleteSession(confirmDelete)}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast ── */}
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    </>
  )
}