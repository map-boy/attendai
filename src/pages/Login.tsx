import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/auth'
import GlowBg from '../components/GlowBg'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [focus, setFocus] = useState(false)
  const navigate = useNavigate()

  const handleLogin = () => {
    if (login(password)) {
      navigate('/', { replace: true })
    } else {
      setError(true)
      setPassword('')
      setTimeout(() => setError(false), 2500)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>
      <GlowBg />
      <div style={{
        position: 'relative', zIndex: 10,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 24, padding: '48px 40px', width: '100%', maxWidth: 400,
        animation: 'slideUp 0.5s ease',
      }}>
        {/* Logo */}
        <div style={{
          fontSize: 22, fontWeight: 800,
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 32,
        }}>
          AttendAI
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Teacher Login</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>
          Enter your password to access the dashboard.
        </p>

        <label style={{
          display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8,
        }}>
          Password
        </label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          autoFocus
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            width: '100%', background: 'var(--surface2)',
            border: `1px solid ${error ? 'var(--accent2)' : focus ? 'var(--accent)' : 'var(--border)'}`,
            boxShadow: focus ? '0 0 0 3px rgba(124,108,252,0.15)' : error ? '0 0 0 3px rgba(252,108,143,0.15)' : 'none',
            borderRadius: 12, padding: '14px 16px', color: 'var(--text)',
            fontFamily: 'var(--font-head)', fontSize: 16, outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box',
            marginBottom: 12,
          }}
        />

        {error && (
          <p style={{ color: 'var(--accent2)', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
            ✗ Incorrect password. Try again.
          </p>
        )}

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, var(--accent), #9c6cfc)',
            color: '#fff', border: 'none', borderRadius: 12, padding: 16,
            fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', marginTop: 4,
          }}
        >
          Login →
        </button>
      </div>
    </div>
  )
}