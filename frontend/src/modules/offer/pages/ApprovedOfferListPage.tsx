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

type OfferRow = {
  id: number
  offer_no: string
  customer_name: string
  status: string
  revision_no: number
  section_count: number
  grand_total: number
  currency?: string
  source_request_no: string
}

const primaryButton: CSSProperties = { border: 'none', borderRadius: 12, background: '#991b1b', color: '#fff', padding: '9px 12px', fontWeight: 800, cursor: 'pointer' }
const ghostButton: CSSProperties = { border: '1px solid #d1d5db', borderRadius: 12, background: '#fff', color: '#111827', padding: '9px 12px', fontWeight: 800, cursor: 'pointer' }
const dangerButton: CSSProperties = { border: '1px solid #fecaca', borderRadius: 12, background: '#fff7f7', color: '#b42318', padding: '9px 12px', fontWeight: 800, cursor: 'pointer' }
const modalOverlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000 }
const modalCard: CSSProperties = { width: '100%', maxWidth: 520, background: '#fff', borderRadius: 24, border: '1px solid #e5e7eb', boxShadow: '0 20px 50px rgba(15,23,42,0.25)', padding: 24, display: 'grid', gap: 16 }

function money(value?: number, currency: string = 'EUR') {
  const normalized = currency === 'TL' ? 'TRY' : currency
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: normalized as 'TRY' | 'USD' | 'EUR' }).format(value || 0)
}

export default function ApprovedOfferListPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<OfferRow[]>([])
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' | 'info' }>({ text: '', kind: 'info' })
  const [selected, setSelected] = useState<OfferRow | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    try {
      const response = await apiClient.get('/offers/approved')
      setRows(response.data.items || [])
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'Onaylı teklifler alınamadı', kind: 'error' })
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (!toast.text) return
    const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, text: '' })), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR')
    return rows
      .filter((row) => !q || [row.offer_no, row.customer_name, row.source_request_no].some((value) => String(value || '').toLocaleLowerCase('tr-TR').includes(q)))
      .sort((a, b) => b.id - a.id)
  }, [rows, search])

  const cancelOffer = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      await apiClient.post(`/offers/${selected.id}/cancel`)
      setToast({ text: 'Onaylı teklif iptal edildi.', kind: 'success' })
      setSelected(null)
      await load()
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'Teklif iptal edilemedi.', kind: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const headers = ['Teklif No', 'Müşteri Adı', 'Talep No', 'Durum', 'Revizyon', 'Bölüm', 'Toplam', 'İşlem']

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <AppToast open={!!toast.text} text={toast.text} kind={toast.kind} />

      <div style={standardCardStyle}>
        <ListPageHeader
          title="Onaylı Teklifler"
          total={filteredRows.length}
          search={search}
          searchPlaceholder="Teklif no, müşteri veya talep no ara"
          onSearchChange={setSearch}
          onClear={() => setSearch('')}
          rightSlot={<button type="button" style={ghostButton} onClick={() => navigate('/offers')}>Aktif Tekliflere Dön</button>}
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
                  <td style={{ ...cellStyle, fontWeight: 900, color: '#081734', width: 136 }}>{row.offer_no}</td>
                  <td style={{ ...cellStyle, width: 300 }}><span style={ellipsisTextStyle}>{row.customer_name}</span></td>
                  <td style={{ ...cellStyle, width: 126 }}><span style={ellipsisTextStyle}>{row.source_request_no || '-'}</span></td>
                  <td style={{ ...cellStyle, width: 108 }}><StatusBadge label={row.status} /></td>
                  <td style={{ ...cellStyle, width: 84 }}>Rev. {row.revision_no}</td>
                  <td style={{ ...cellStyle, width: 64 }}>{row.section_count || 0}</td>
                  <td style={{ ...cellStyle, fontWeight: 900, color: '#7a150f', width: 122 }}>{money(row.grand_total, row.currency || 'EUR')}</td>
                  <td style={{ ...cellStyle, width: 156 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button style={primaryButton} onClick={() => navigate(`/offers/${row.id}`)}>Detay</button>
                      {row.status === 'APPROVED' ? <button style={dangerButton} onClick={() => setSelected(row)}>İptal Et</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredRows.length ? <tr><td colSpan={8} style={{ ...cellStyle, padding: 24, textAlign: 'center', color: '#64748b' }}>Gösterilecek onaylı teklif bulunamadı.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#111827' }}>Onaylı teklifi iptal et</div>
            <div style={{ color: '#475569', lineHeight: 1.6 }}>
              <strong>{selected.offer_no}</strong> numaralı onaylı teklif iptal edilecek. Bu kayıt ana teklif listesine geri dönmeyecek ve bu tekliften yeni protokol oluşturulamayacak.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" style={ghostButton} onClick={() => setSelected(null)} disabled={submitting}>Vazgeç</button>
              <button type="button" style={dangerButton} onClick={() => void cancelOffer()} disabled={submitting}>{submitting ? 'İptal ediliyor...' : 'İptali Onayla'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
