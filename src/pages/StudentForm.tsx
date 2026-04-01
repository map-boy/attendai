import React, { useState, useEffect, useRef } from 'react'
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
    transition: 'border-color 0.2s', boxSizing: 'border-box',
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
function getBrowserToken(): string {
  const key = '__attend_browser_token__'
  let token = localStorage.getItem(key)
  if (!token) {
    token = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(key, token)
  }
  return token
}

function getFingerprint(): string {
  const nav = window.navigator
  const raw = [
    nav.userAgent, nav.language,
    nav.languages?.join(',') ?? '', nav.platform,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    new Date().getTimezoneOffset(),
    (nav as unknown as Record<string, unknown>).hardwareConcurrency ?? '',
    (nav as unknown as Record<string, unknown>).deviceMemory ?? '',
    getBrowserToken(),
  ].join('|')
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

async function getIP(): Promise<string> {
  try {
    const r = await fetch('https://api.ipify.org?format=json')
    const d = await r.json()
    return d.ip as string
  } catch { return 'unknown' }
}

function deviceBlockKey(sessionId: string, fingerprint: string) {
  return `device_attended_${sessionId}_${fingerprint}`
}
function isDeviceBlocked(sessionId: string, fingerprint: string) {
  return localStorage.getItem(deviceBlockKey(sessionId, fingerprint)) === '1'
}
function setDeviceBlock(sessionId: string, fingerprint: string) {
  localStorage.setItem(deviceBlockKey(sessionId, fingerprint), '1')
}

/* ── Upload photo to Supabase Storage ── */
async function uploadPhoto(file: File, sessionId: string): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${sessionId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('photos')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) { console.error('Photo upload error:', error); return null }
  const { data } = supabase.storage.from('photos').getPublicUrl(path)
  return data.publicUrl
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
  const [fingerprint] = useState(() => getFingerprint())

  // ── Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [successName, setSuccessName] = useState('')
  const [successTime, setSuccessTime] = useState('')
  const [successPhoto, setSuccessPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) { setAppState('error'); return }
    if (isDeviceBlocked(sessionId, fingerprint)) { setAppState('blocked'); return }
    supabase.from('sessions').select('*').eq('id', sessionId).single()
      .then(({ data, error }) => {
        if (error || !data) { setAppState('error'); return }
        const session = data as Session
        if (!session.is_active) { setAppState('closed'); return }
        setSessionData(session)
        setAppState('form')
      })
  }, [sessionId, fingerprint])

  /* ── Handle photo file pick ── */
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be under 5 MB.')
      return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setUploadProgress('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* ── Submit ── */
  const handleSubmit = async () => {
    const name = studentName.trim()
    if (!name || name.length < 2) { alert('Please enter your full name.'); return }
    if (isDeviceBlocked(sessionId, fingerprint)) { setAppState('blocked'); return }

    setSubmitting(true)

    // Upload photo if present
    let photoUrl: string | null = null
    if (photoFile) {
      setUploadProgress('uploading')
      photoUrl = await uploadPhoto(photoFile, sessionId)
      if (!photoUrl) {
        setUploadProgress('error')
        alert('Photo upload failed. You can remove the photo and try again, or submit without it.')
        setSubmitting(false)
        return
      }
      setUploadProgress('done')
    }

    const ip = await getIP()

    const { error } = await supabase.from('attendance').insert({
      session_id: sessionId,
      student_name: name,
      ip_address: ip,
      device_fingerprint: fingerprint,
      photo_url: photoUrl,
    })

    if (error) {
      if (error.code === '23505' || error.message.includes('unique')) {
        setDeviceBlock(sessionId, fingerprint)
        setAppState('blocked')
        setSubmitting(false)
        return
      }
      alert('Submission failed: ' + error.message)
      setSubmitting(false)
      return
    }

    setDeviceBlock(sessionId, fingerprint)
    setSuccessName(name)
    setSuccessTime(new Date().toLocaleTimeString())
    setSuccessPhoto(photoUrl)
    setAppState('success')
  }

  /* ── Submit button label ── */
  const submitLabel = () => {
    if (!submitting) return 'Submit Attendance'
    if (uploadProgress === 'uploading') return 'Uploading photo…'
    return 'Submitting…'
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
            <p style={s.subtitle}>Enter your full name and optionally add a photo.</p>

            {/* Name */}
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

            {/* Photo upload */}
            <div style={{ marginBottom: 24 }}>
              <label style={s.label}>
                Photo <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>

              {!photoPreview ? (
                /* Drop zone / pick button */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '1.5px dashed var(--border)', borderRadius: 12,
                    padding: '22px 16px', textAlign: 'center', cursor: 'pointer',
                    color: 'var(--muted)', fontSize: 13,
                    background: 'var(--surface2)',
                    transition: 'border-color .2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Tap to choose from your photos</div>
                  <div style={{ fontSize: 11 }}>Pick from gallery or take a new photo · JPG, PNG, WEBP · max 5 MB</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                  />
                </div>
              ) : (
                /* Preview */
                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                  <img
                    src={photoPreview}
                    alt="preview"
                    style={{
                      width: '100%', maxHeight: 220, objectFit: 'cover',
                      borderRadius: 12, border: '1px solid var(--border)', display: 'block',
                    }}
                  />
                  <button
                    onClick={removePhoto}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(10,10,15,0.85)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '4px 10px', color: 'var(--accent2)',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    ✕ Remove
                  </button>
                  {uploadProgress === 'uploading' && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 12,
                      background: 'rgba(10,10,15,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent)', fontWeight: 700, fontSize: 14,
                    }}>
                      Uploading…
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              style={{ ...s.btnSubmit, opacity: submitting ? 0.55 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitLabel()}
            </button>

            <div style={s.note}>
              ✏️ Enter your own name. One submission per device per session. Photo is optional.
            </div>
          </>
        )}

        {/* SUCCESS */}
        {appState === 'success' && (
          <>
            <div style={s.successIcon}>✓</div>
            <div style={s.successTitle}>Attendance Marked!</div>
            <p style={s.successSub}>Your attendance has been recorded. You may close this page.</p>

            {/* Show submitted photo */}
            {successPhoto && (
              <img
                src={successPhoto}
                alt="Your submitted photo"
                style={{
                  width: '100%', maxHeight: 180, objectFit: 'cover',
                  borderRadius: 12, border: '1px solid var(--border)',
                  marginBottom: 16, display: 'block',
                }}
              />
            )}

            <div style={s.recordBox}>
              {[
                { label: 'Name', value: successName },
                { label: 'Session', value: sessionData?.name ?? '' },
                { label: 'Time', value: successTime },
                ...(successPhoto ? [{ label: 'Photo', value: '✓ Uploaded' }] : []),
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  style={{ ...s.recordRow, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{row.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: row.label === 'Photo' ? 'var(--green)' : undefined }}>
                    {row.value}
                  </span>
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
              Attendance from this device has already been recorded for this session.
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