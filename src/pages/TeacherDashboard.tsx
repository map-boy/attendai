import React, { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, Session, AttendanceRecord } from '../lib/supabase'
import GlowBg from '../components/GlowBg'
import type { User } from '@supabase/supabase-js'

/* ─────────────────── STYLES ─────────────────── */
const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loginBox: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '48px 40px', width: '100%', maxWidth: 420,
    animation: 'slideUp 0.5s ease', position: 'relative', zIndex: 10,
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(124,108,252,0.15)', border: '1px solid rgba(124,108,252,0.3)',
    borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600,
    letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 24,
  },
  h1: { fontSize: 32, fontWeight: 800, lineHeight: 1.1, marginBottom: 8 },
  sub: { color: 'var(--muted)', fontSize: 14, marginBottom: 32 },
  label: {
    display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8,
  },
  input: {
    width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 16px', color: 'var(--text)',
    fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none',
  },
  btnPrimary: {
    width: '100%', background: 'var(--accent)', color: '#fff', border: 'none',
    borderRadius: 10, padding: 14, fontFamily: 'var(--font-head)', fontSize: 15,
    fontWeight: 700, cursor: 'pointer', marginTop: 8,
  },
  errBox: {
    background: 'rgba(252,108,143,0.1)', border: '1px solid rgba(252,108,143,0.3)',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--accent2)', marginTop: 12,
  },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 32px', borderBottom: '1px solid var(--border)',
    background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(12px)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  logo: {
    fontSize: 20, fontWeight: 800,
    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  pill: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 999, padding: '6px 14px', fontSize: 13, color: 'var(--muted)',
  },
  btnLogout: {
    background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 16px', color: 'var(--muted)', fontFamily: 'var(--font-head)',
    fontSize: 13, cursor: 'pointer',
  },
  main: { padding: 32, maxWidth: 1100, margin: '0 auto' },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16,
  },
  createCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 24, marginBottom: 32,
  },
  btnCreate: {
    background: 'linear-gradient(135deg, var(--accent), #9c6cfc)',
    color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px',
    fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 20, marginBottom: 32,
  },
  sessionCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 20, animation: 'fadeIn 0.3s ease',
  },
  sessionName: { fontSize: 18, fontWeight: 700 },
  sessionTime: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginTop: 4 },
  statBox: {
    background: 'var(--surface2)', borderRadius: 8,
    padding: '8px 12px', flex: 1, textAlign: 'center',
  },
  statNum: { fontSize: 22, fontWeight: 800, color: 'var(--accent)' },
  statLabel: { fontSize: 11, color: 'var(--muted)', marginTop: 2 },
  btnSm: { borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-head)', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none' },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 32, width: '90%', maxWidth: 480,
    animation: 'slideUp 0.3s ease', position: 'relative',
  },
  modalClose: {
    position: 'absolute', top: 16, right: 16,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 8, width: 32, height: 32, color: 'var(--muted)',
    fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  qrWrap: {
    background: '#fff', borderRadius: 12, padding: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 20px', width: 200, height: 200,
  },
  qrUrl: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)',
    fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 12,
  },
  btnCopy: {
    width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: 10, color: 'var(--text)', fontFamily: 'var(--font-head)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  attScroll: { maxHeight: 360, overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left', padding: '8px 12px', fontSize: 11,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)',
    borderBottom: '1px solid var(--border)',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid rgba(42,42,58,0.5)' },
  noSessions: { textAlign: 'center', padding: '48px 32px', color: 'var(--muted)' },
  spinner: {
    width: 20, height: 20, border: '2px solid var(--border)',
    borderTopColor: 'var(--accent)', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite', display: 'inline-block',
  },
}

/* ─────────────────── COMPONENT ─────────────────── */
export default function TeacherDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [sessions, setSessions] = useState<Session[]>([])
  const [countMap, setCountMap] = useState<Record<string, number>>({})
  const [newSessionName, setNewSessionName] = useState('')
  const [creating, setCreating] = useState(false)

  const [qrModal, setQrModal] = useState<{ id: string; name: string } | null>(null)
  const [attModal, setAttModal] = useState<{ id: string; name: string } | null>(null)
  const [attList, setAttList] = useState<AttendanceRecord[]>([])
  const [attLoading, setAttLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // ── Auto session check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(data.session.user)
    })
  }, [])

  // ── Load sessions
  const loadSessions = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
    if (!data) return
    setSessions(data as Session[])

    if (data.length > 0) {
      const ids = data.map((s) => s.id)
      const { data: counts } = await supabase
        .from('attendance')
        .select('session_id')
        .in('session_id', ids)
      const map: Record<string, number> = {}
      ;(counts || []).forEach((r: { session_id: string }) => {
        map[r.session_id] = (map[r.session_id] || 0) + 1
      })
      setCountMap(map)
    }
  }, [user])

  useEffect(() => { loadSessions() }, [loadSessions])

  // ── Realtime attendance
  useEffect(() => {
    const channel = supabase
      .channel('attendance-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance' }, () => {
        loadSessions()
        if (attModal) loadAttendance(attModal.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadSessions, attModal])

  // ── Login
  const handleLogin = async () => {
    setLoginErr('')
    if (!email || !password) { setLoginErr('Please fill in all fields.'); return }
    setLoginLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoginLoading(false)
    if (error) { setLoginErr(error.message); return }
    setUser(data.user)
  }

  const handleSignup = async () => {
    if (!email || !password) { setLoginErr('Enter email and password to register.'); return }
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setLoginErr(error.message); return }
    setLoginErr('✅ Account created! Check your email to confirm, then sign in.')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSessions([])
  }

  // ── Create session
  const createSession = async () => {
    if (!newSessionName.trim()) { alert('Enter a session name.'); return }
    setCreating(true)
    await supabase.from('sessions').insert({
      name: newSessionName.trim(),
      created_by: user!.id,
      is_active: true,
    })
    setNewSessionName('')
    setCreating(false)
    loadSessions()
  }

  // ── Close session
  const closeSession = async (id: string) => {
    if (!confirm('Close this session? Students will no longer be able to register.')) return
    await supabase.from('sessions').update({ is_active: false }).eq('id', id)
    loadSessions()
  }

  // ── Load attendance list
  const loadAttendance = async (sessionId: string) => {
    setAttLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('session_id', sessionId)
      .order('submitted_at', { ascending: true })
    setAttList((data as AttendanceRecord[]) || [])
    setAttLoading(false)
  }

  const openAttModal = (id: string, name: string) => {
    setAttModal({ id, name })
    loadAttendance(id)
  }

  const studentUrl = (sessionId: string) =>
    `${window.location.origin}/student?session=${sessionId}`

  const copyUrl = (sessionId: string) => {
    navigator.clipboard.writeText(studentUrl(sessionId))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ── LOGIN SCREEN ── */
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GlowBg />
        <div style={s.loginBox}>
          <div style={s.badge}>🎓 Teacher Portal</div>
          <h1 style={s.h1}>Welcome back,<br />Professor.</h1>
          <p style={s.sub}>Sign in to manage your attendance sessions.</p>

          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="you@school.edu"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>

          <button style={{ ...s.btnPrimary, opacity: loginLoading ? 0.5 : 1 }}
            onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? 'Signing in…' : 'Sign In'}
          </button>

          {loginErr && <div style={s.errBox}>{loginErr}</div>}

          <p style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            No account yet?{' '}
            <span onClick={handleSignup}
              style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
              Create one
            </span>
          </p>
        </div>
      </div>
    )
  }

  /* ── DASHBOARD ── */
  return (
    <div style={{ minHeight: '100vh' }}>
      <GlowBg />

      {/* Topbar */}
      <div style={s.topbar}>
        <div style={s.logo}>AttendAI</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={s.pill}>
            Signed in as <strong style={{ color: 'var(--text)' }}>{user.email}</strong>
          </div>
          <button style={s.btnLogout} onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      <div style={s.main}>
        {/* Create Session */}
        <div style={s.sectionTitle as React.CSSProperties}>New Session</div>
        <div style={s.createCard}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Session Name</label>
              <input style={s.input} type="text"
                placeholder="e.g. CS101 — Week 5 Lecture"
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createSession()} />
            </div>
            <button style={{ ...s.btnCreate, opacity: creating ? 0.5 : 1 }}
              onClick={createSession} disabled={creating}>
              {creating ? 'Creating…' : '+ Create Session'}
            </button>
          </div>
        </div>

        {/* Sessions Grid */}
        <div style={s.sectionTitle as React.CSSProperties}>Your Sessions</div>
        {sessions.length === 0 ? (
          <div style={s.noSessions}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h3 style={{ fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>No sessions yet</h3>
            <p>Create your first session above to get started.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {sessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                count={countMap[session.id] || 0}
                onShowQR={() => setQrModal({ id: session.id, name: session.name })}
                onViewList={() => openAttModal(session.id, session.name)}
                onClose={() => closeSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setQrModal(null)}>
          <div style={s.modal}>
            <button style={s.modalClose} onClick={() => setQrModal(null)}>✕</button>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Scan to Attend</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>{qrModal.name}</p>
            <div style={s.qrWrap}>
              <QRCodeSVG value={studentUrl(qrModal.id)} size={168} level="H" />
            </div>
            <div style={s.qrUrl}>{studentUrl(qrModal.id)}</div>
            <button style={s.btnCopy} onClick={() => copyUrl(qrModal.id)}>
              {copied ? '✅ Copied!' : '📋 Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attModal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setAttModal(null)}>
          <div style={{ ...s.modal, maxWidth: 560 }}>
            <button style={s.modalClose} onClick={() => setAttModal(null)}>✕</button>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Attendance List</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>{attModal.name}</p>
            <div style={s.attScroll}>
              {attLoading ? (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <div style={s.spinner} />
                </div>
              ) : attList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontSize: 14 }}>
                  No students have registered yet.
                </div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>#</th>
                      <th style={s.th}>Student Name</th>
                      <th style={s.th}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attList.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ ...s.td, color: 'var(--muted)' }}>{i + 1}</td>
                        <td style={{ ...s.td, fontWeight: 600 }}>{r.student_name}</td>
                        <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                          {new Date(r.submitted_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Session Card ── */
interface SessionCardProps {
  session: Session
  count: number
  onShowQR: () => void
  onViewList: () => void
  onClose: () => void
}

function SessionCard({ session, count, onShowQR, onViewList, onClose }: SessionCardProps) {
  const date = new Date(session.created_at).toLocaleString()

  return (
    <div style={{
      ...s.sessionCard,
      borderColor: session.is_active ? 'rgba(124,108,252,0.5)' : 'var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={s.sessionName}>{session.name}</div>
          <div style={s.sessionTime}>{date}</div>
        </div>
        <StatusDot active={session.is_active} />
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={s.statBox}>
          <div style={s.statNum}>{count}</div>
          <div style={s.statLabel}>Students</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {session.is_active && (
          <button style={{
            ...s.btnSm,
            background: 'rgba(124,108,252,0.15)', color: 'var(--accent)',
            border: '1px solid rgba(124,108,252,0.3)',
          }} onClick={onShowQR}>
            📱 Show QR
          </button>
        )}
        <button style={{
          ...s.btnSm,
          background: 'rgba(74,222,128,0.1)', color: 'var(--green)',
          border: '1px solid rgba(74,222,128,0.25)',
        }} onClick={onViewList}>
          📋 View List
        </button>
        {session.is_active && (
          <button style={{
            ...s.btnSm,
            background: 'rgba(252,108,143,0.1)', color: 'var(--accent2)',
            border: '1px solid rgba(252,108,143,0.25)',
          }} onClick={onClose}>
            🔒 Close
          </button>
        )}
      </div>
    </div>
  )
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
      background: active ? 'rgba(74,222,128,0.15)' : 'rgba(107,107,138,0.15)',
      color: active ? 'var(--green)' : 'var(--muted)',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
        background: active ? 'var(--green)' : 'var(--muted)',
        animation: active ? 'pulse 1.5s infinite' : 'none',
      }} />
      {active ? 'Live' : 'Closed'}
    </div>
  )
}
