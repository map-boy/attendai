import React from 'react'

const GlowBg: React.FC = () => (
  <>
    <div style={{
      position: 'fixed', borderRadius: '50%', filter: 'blur(120px)',
      pointerEvents: 'none', zIndex: 0,
      width: 600, height: 600,
      background: 'rgba(124,108,252,0.12)',
      top: -200, left: -200
    }} />
    <div style={{
      position: 'fixed', borderRadius: '50%', filter: 'blur(120px)',
      pointerEvents: 'none', zIndex: 0,
      width: 400, height: 400,
      background: 'rgba(252,108,143,0.08)',
      bottom: -100, right: -100
    }} />
  </>
)

export default GlowBg
