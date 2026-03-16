import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../../api/client'
import { StatusBadge } from '../../../components/badges/StatusBadge'
import { AppToast } from '../../../components/feedback/AppToast'
import {
  ListPageHeader,
  cellStyle,
  darkHeaderRowStyle,
  ellipsisTextStyle,
  standardCardStyle,
  standardTableStyle,
  standardTableWrap,
  thStyle,
} from '../../../components/listing/ListPageHeader'

type ProtocolRow = {
  id: number
  protocol_no: string
  offer_no: string | null
  customer_name: string
  inspection_type_name: string
  status: string
  revision_no: number
  is_current: boolean
  is_readonly?: boolean
}

const button: CSSProperties = { border: 'none', borderRadius: 12, background: '#991b1b', color: '#fff', padding: '9px 12px', fontWeight: 800, cursor: 'pointer' }

export default function ProtocolListPage() {
  const [rows, setRows] = useState<ProtocolRow[]>([])
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' | 'info' }>({ text: '', kind: 'info' })
  const navigate = useNavigate()

  useEffect(() => {
    apiClient.get('/protocols').then((response) => setRows(response.data.items || [])).catch((err) => setToast({ text: err?.response?.data?.detail || 'Protokol verileri alınamadı', kind: 'error' }))
  }, [])

  useEffect(() => {
    if (!toast.text) return
    const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, text: '' })), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR')
    return rows.filter((row) => !q || [row.protocol_no, row.offer_no, row.customer_name, row.inspection_type_name].some((value) => String(value || '').toLocaleLowerCase('tr-TR').includes(q)))
  }, [rows, search])

  const headers = ['Protokol No', 'Teklif No', 'Müşteri Adı', 'Muayene Türü', 'Durum', 'Revizyon', 'Erişim', 'İşlem']

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <AppToast open={!!toast.text} text={toast.text} kind={toast.kind} />

      <div style={standardCardStyle}>
        <ListPageHeader
          title="Protokoller"
          total={filteredRows.length}
          search={search}
          searchPlaceholder="Protokol no, teklif no, müşteri veya muayene türü ara"
          onSearchChange={setSearch}
          onClear={() => setSearch('')}
        />
        <div style={standardTableWrap}>
          <table style={{ ...standardTableStyle, minWidth: 1120 }}>
            <thead>
              <tr style={darkHeaderRowStyle}>
                {headers.map((header, index) => (
                  <th key={header} style={thStyle(index, headers.length)}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={row.id} style={{ background: index % 2 ? '#fff' : '#fcfcfd' }}>
                  <td style={{ ...cellStyle, fontWeight: 800, color: '#081734', width: 138 }}>{row.protocol_no}</td>
                  <td style={{ ...cellStyle, width: 112 }}><span style={ellipsisTextStyle}>{row.offer_no || '-'}</span></td>
                  <td style={{ ...cellStyle, width: 320 }}><span style={ellipsisTextStyle}>{row.customer_name}</span></td>
                  <td style={{ ...cellStyle, width: 178 }}><span style={ellipsisTextStyle}>{row.inspection_type_name}</span></td>
                  <td style={{ ...cellStyle, width: 108 }}><StatusBadge label={row.status} /></td>
                  <td style={{ ...cellStyle, width: 84 }}>Rev. {row.revision_no}</td>
                  <td style={{ ...cellStyle, width: 112 }}><StatusBadge label={row.is_readonly ? 'READONLY' : 'CURRENT'} /></td>
                  <td style={{ ...cellStyle, width: 108 }}><button style={button} onClick={() => navigate(`/protocols/${row.id}`)}>Detay</button></td>
                </tr>
              ))}
              {!filteredRows.length ? <tr><td colSpan={8} style={{ ...cellStyle, padding: 24, textAlign: 'center', color: '#64748b' }}>Gösterilecek protokol bulunamadı</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
