import type { CSSProperties } from 'react'

type ToastKind = 'success' | 'error' | 'info'

const palette: Record<ToastKind, { bg: string; border: string; fg: string }> = {
  success: { bg: '#ecfdf3', border: '#a6f4c5', fg: '#166534' },
  error: { bg: '#fff1f2', border: '#fecaca', fg: '#991b1b' },
  info: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
}

const wrap: CSSProperties = {
  position: 'fixed',
  top: 18,
  right: 18,
  zIndex: 10000,
}

export function AppToast({ open, text, kind = 'info' }: { open: boolean; text: string; kind?: ToastKind }) {
  if (!open || !text) return null
  const current = palette[kind]
  return (
    <div style={wrap}>
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 14,
          border: `1px solid ${current.border}`,
          background: current.bg,
          color: current.fg,
          boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
          fontWeight: 700,
          minWidth: 280,
          maxWidth: 420,
        }}
      >
        {text}
      </div>
    </div>
  )
}
