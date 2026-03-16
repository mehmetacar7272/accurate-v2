import type { CSSProperties } from 'react'

const baseStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }

export function StatusBadge({ label }: { label: string }) {
  const palette: Record<string, { bg: string; fg: string; text: string }> = {
    DRAFT: { bg: '#fef3c7', fg: '#92400e', text: 'Taslak' },
    APPROVED: { bg: '#dcfce7', fg: '#166534', text: 'Onaylandı' },
    CANCELLED: { bg: '#fee2e2', fg: '#991b1b', text: 'İptal Edildi' },
    SUPERSEDED: { bg: '#e2e8f0', fg: '#334155', text: 'Eski Revizyon' },
    CURRENT: { bg: '#dbeafe', fg: '#1d4ed8', text: 'Güncel' },
    READONLY: { bg: '#ede9fe', fg: '#6d28d9', text: 'Salt Okunur' },
    PENDING: { bg: '#fef3c7', fg: '#92400e', text: 'Bekliyor' },
    IN_PROGRESS: { bg: '#ffedd5', fg: '#c2410c', text: 'Devam Ediyor' },
    PASSIVE: { bg: '#e5e7eb', fg: '#374151', text: 'Pasif' },
  }
  const current = palette[label] || { bg: '#e2e8f0', fg: '#334155', text: label }
  return <span style={{ ...baseStyle, background: current.bg, color: current.fg }}>{current.text}</span>
}
