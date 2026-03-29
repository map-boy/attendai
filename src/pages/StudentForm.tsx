import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, Session } from '../lib/supabase'
import GlowBg from '../components/GlowBg'

type AppState = 'loading' | 'form' | 'success' | 'blocked' | 'closed' | 'error'

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 24,
  },
  card: {
    position: 'relative', zIndex: 10,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 440,
    animation: 'slideUp 0.5s ease',
  },
  logo: {
    fontSize: 15, fontWeight: 800,
    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    marginBottom: 24, display: 'inline-block',
  },
  sessionBanner: {
    background: 'rgba(124,108,252,0.1)', border: '1px solid rgba(124,108,252,0.25)',
    borderRadius: 10, padding: '12px 16px', marginBottom: 28,
  },
  bannerLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4,
  },
  bannerName: { fontSize: 16, fontWeight: 700, color: 'var(--accent)' },
  h1: { fontSize: 28, fontWeight: 800, marginBottom: 8 },
  subtitle: { color: 'var(--muted)', fontSize: 14, marginBottom: 32 },
  label: {
    display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8,
  },
  input: {
    width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '14px 16px', color: 'var(--text)',
    fontFamily: 'var(--font-head)', fontSize: 16, outline: 'none',
    transition: 'border-color 0.2s',
  },
  btnSubmit: {
    width: '100%',
    background: 'linear-gradient(135deg, var(--accent), #9c6cfc)',
    color: '#fff', border: 'none', borderRadius: 12, padding: 16,
    fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  },
  note: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    background: 'rgba(107,107,138,0.1)', border: '1px solid rgba(107,107,138,0.2)',
    borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--muted)', marginTop: 20,
  },
  successIcon: {
    width: 72, height: 72, background: 'rgba(74,222,128,0.15)',
    border: '2px solid rgba(74,222,128,0.4)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, margin: '0 auto 24px', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
  },
  successTitle: { fontSize: 26, fontWeight: 800, textAlign: 'center', marginBottom: 8, color: 'var(--green)' },
  successSub: { textAlign: 'center', color: 'var(--muted)', fontSize: 14, marginBottom: 24 },
  recordBox: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 20px',
  },
  recordRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0',
    borderBottom: '1px solid var(--border)',
  },
  stateIcon: { fontSize: 52, textAlign: 'center', marginBottom: 16 },
  stateTitle: { fontSize: 24, fontWeight: 800, textAlign: 'center', marginBottom: 8 },
  stateSub: { textAlign: 'center', color: 'var(--muted)', fontSize: 14 },
  spinner: {
    width: 36, height: 36, borderRadius: '50%',
    border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
    animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
  },
}

/* ── Device fingerprint ── */
function getFingerprint(): string {
  const nav = window.navigator
  const raw = [
    nav.userAgent, nav.language, nav.platform,
    `${screen.width}x${screen.height}`, screen.colorDepth,
    new Date().getTimezoneOffset(),
    (nav as unknown as Record<string, unknown>).hardwareConcurrency ?? '',
    (nav as unknown as Record<string, unknown>).deviceMemory ?? '',
  ].join('|')
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

async function getIP(): Promise<string> {
  try {
    const r = await fetch('https://api.ipify.org?format=json')
    const d = await r.json()
    return d.ip as string
  } catch {
    return 'unknown'
  }
}

function isLocallyBlocked(sessionId: string): boolean {
  return localStorage.getItem(`attended_${sessionId}`) === '1'
}

function setLocalBlock(sessionId: string): void {
  localStorage.setItem(`attended_${sessionId}`, '1')
}

/* ── Component ── */
export default function StudentForm() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') ?? ''

  const [appState, setAppState] = useState<AppState>('loading')
  const [sessionData, setSessionData] = useState<Session | null>(null)
  const [studentName, setStudentName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [focusInput, setFocusInput] = useState(false)

  // Success state
  const [successName, setSuccessName] = useState('')
  const [successTime, setSuccessTime] = useState('')

  useEffect(() => {
    if (!sessionId) { setAppState('error'); return }
    if (isLocallyBlocked(sessionId)) { setAppState('blocked'); return }

    supabase.from('sessions').select('*').eq('id', sessionId).single()
      .then(({ data, error }) => {
        if (error || !data) { setAppState('error'); return }
        const session = data as Session
        if (!session.is_active) { setAppState('closed'); return }
        setSessionData(session)
        setAppState('form')
      })
  }, [sessionId])

  const handleSubmit = async () => {
    const name = studentName.trim()
    if (!name || name.length < 2) { alert('Please enter your full name.'); return }
    setSubmitting(true)

    const fingerprint = getFingerprint()
    const ip = await getIP()

    const { error } = await supabase.from('attendance').insert({
      session_id: sessionId,
      student_name: name,
      ip_address: ip,
      device_fingerprint: fingerprint,
    })

    if (error) {
      if (error.code === '23505' || error.message.includes('unique')) {
        setLocalBlock(sessionId)
        setAppState('blocked')
        return
      }
      alert('Submission failed: ' + error.message)
      setSubmitting(false)
      return
    }

    setLocalBlock(sessionId)
    setSuccessName(name)
    setSuccessTime(new Date().toLocaleTimeString())
    setAppState('success')
  }

  return (
    <div style={s.page}>
      <GlowBg />
      <div style={s.card}>
        <div style={s.logo}>AttendAI</div>

        {/* LOADING */}
        {appState === 'loading' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={s.spinner} />
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Verifying session…</p>
          </div>
        )}

        {/* FORM */}
        {appState === 'form' && (
          <>
            <div style={s.sessionBanner}>
              <div style={s.bannerLabel as React.CSSProperties}>Session</div>
              <div style={s.bannerName}>{sessionData?.name}</div>
            </div>
            <h1 style={s.h1}>Mark Your<br />Attendance</h1>
            <p style={s.subtitle}>Enter your full name below. One submission per device.</p>
            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Full Name</label>
              <input
                style={{
                  ...s.input,
                  borderColor: focusInput ? 'var(--accent)' : 'var(--border)',
                  boxShadow: focusInput ? '0 0 0 3px rgba(124,108,252,0.15)' : 'none',
                }}
                type="text"
                placeholder="e.g. Jean Claude Uwimana"
                autoComplete="off"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                onFocus={() => setFocusInput(true)}
                onBlur={() => setFocusInput(false)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <button
              style={{ ...s.btnSubmit, opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Attendance'}
            </button>
            <div style={s.note}>
              🔒 Your submission is locked to this device and network. You cannot submit twice.
            </div>
          </>
        )}

        {/* SUCCESS */}
        {appState === 'success' && (
          <>
            <div style={s.successIcon}>✓</div>
            <div style={s.successTitle}>Attendance Marked!</div>
            <p style={s.successSub}>Your attendance has been recorded successfully.</p>
            <div style={s.recordBox}>
              {[
                { label: 'Name', value: successName },
                { label: 'Session', value: sessionData?.name ?? '' },
                { label: 'Time', value: successTime },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ ...s.recordRow, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{row.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* BLOCKED */}
        {appState === 'blocked' && (
          <>
            <div style={s.stateIcon as React.CSSProperties}>🚫</div>
            <div style={{ ...s.stateTitle, color: 'var(--accent2)' }}>Already Submitted</div>
            <p style={s.stateSub}>
              Attendance has already been marked from this device or network for this session.
              <br /><br />Each student may only submit once.
            </p>
          </>
        )}

        {/* CLOSED */}
        {appState === 'closed' && (
          <>
            <div style={s.stateIcon as React.CSSProperties}>🔒</div>
            <div style={{ ...s.stateTitle, color: 'var(--yellow)' }}>Session Closed</div>
            <p style={s.stateSub}>
              This attendance session has been closed by your teacher and is no longer accepting submissions.
            </p>
          </>
        )}

        {/* ERROR */}
        {appState === 'error' && (
          <>
            <div style={s.stateIcon as React.CSSProperties}>⚠️</div>
            <div style={{ ...s.stateTitle, color: 'var(--accent2)' }}>Invalid Session</div>
            <p style={s.stateSub}>
              This QR code or link is invalid. Please ask your teacher for a new one.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
