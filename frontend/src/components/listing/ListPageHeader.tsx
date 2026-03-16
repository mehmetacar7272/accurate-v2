import type { CSSProperties, ReactNode } from 'react'

type Props = {
  title: string
  total: number
  search: string
  searchPlaceholder: string
  onSearchChange: (value: string) => void
  onClear: () => void
  rightSlot?: ReactNode
}

const pillStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: '#0f172a',
  background: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: 999,
  padding: '5px 10px',
}

const inputStyle: CSSProperties = {
  width: 480,
  maxWidth: '100%',
  border: '1px solid #d1d5db',
  borderRadius: 20,
  padding: '14px 18px',
  fontSize: 15,
  boxSizing: 'border-box',
  background: '#fff',
}

const ghostButton: CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 18,
  background: '#fff',
  color: '#111827',
  padding: '14px 18px',
  fontWeight: 800,
  cursor: 'pointer',
}

export function ListPageHeader({ title, total, search, searchPlaceholder, onSearchChange, onClear, rightSlot }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <span style={pillStyle}>Toplam: {total}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
        {rightSlot}
        <input
          style={inputStyle}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button type="button" style={ghostButton} onClick={onClear}>
          Temizle
        </button>
      </div>
    </div>
  )
}

export const standardCardStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 18,
  border: '1px solid #e5e7eb',
  padding: 20,
  boxShadow: '0 12px 32px rgba(15,23,42,0.06)',
}

export const standardTableWrap: CSSProperties = {
  width: '100%',
  overflowX: 'auto',
}

export const standardTableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  minWidth: 980,
  tableLayout: 'fixed',
}

export const darkHeaderRowStyle: CSSProperties = {
  background: '#0f172a',
}

export function thStyle(index: number, length: number): CSSProperties {
  return {
    color: '#fff',
    textAlign: 'left',
    padding: '14px 12px',
    fontSize: 14,
    borderTopLeftRadius: index === 0 ? 14 : 0,
    borderTopRightRadius: index === length - 1 ? 14 : 0,
    whiteSpace: 'nowrap',
  }
}

export const cellStyle: CSSProperties = {
  padding: '12px 12px',
  verticalAlign: 'middle',
  borderTop: '1px solid #e5e7eb',
}

export const ellipsisTextStyle: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
