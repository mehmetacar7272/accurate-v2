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
  has_approved_offer_file?: boolean
}

const primaryButton: CSSProperties = { border: 'none', borderRadius: 10, background: '#991b1b', color: '#fff', padding: '7px 10px', fontWeight: 800, cursor: 'pointer', minWidth: 86, height: 38 }
const ghostButton: CSSProperties = { border: '1px solid #d1d5db', borderRadius: 12, background: '#fff', color: '#111827', padding: '9px 12px', fontWeight: 800, cursor: 'pointer' }
const dangerButton: CSSProperties = { border: '1px solid #fecaca', borderRadius: 10, background: '#fff7f7', color: '#b42318', padding: '7px 10px', fontWeight: 800, cursor: 'pointer', minWidth: 86, height: 38 }
const modalOverlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000 }
const modalCard: CSSProperties = { width: '100%',  background: '#fff', borderRadius: 24, border: '1px solid #e5e7eb', boxShadow: '0 20px 50px rgba(15,23,42,0.25)', padding: 24, display: 'grid', gap: 16 }

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

  const submitRowAction = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      if (selected.status === 'APPROVED') {
        await apiClient.post(`/offers/${selected.id}/cancel`)
        setToast({ text: 'Onaylı teklif iptal edildi.', kind: 'success' })
      } else {
        await apiClient.post(`/offers/${selected.id}/archive`)
        setToast({ text: 'İptal edilen teklif listeden pasife alındı.', kind: 'success' })
      }
      setSelected(null)
      await load()
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'İşlem tamamlanamadı.', kind: 'error' })
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
          <table style={{ ...standardTableStyle, minWidth: 1120, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 110 }} />
              <col />
              <col style={{ width: 150 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 96 }} />
            </colgroup>
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
                  <td style={{ ...cellStyle, fontWeight: 900, color: '#081734', whiteSpace: 'nowrap', width: 116 }}><div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span>{row.offer_no}</span>{row.has_approved_offer_file ? <span title="İmzalı PDF yüklü" style={{ width: 10, height: 10, borderRadius: 999, background: '#16a34a', display: 'inline-block', boxShadow: '0 0 0 2px #dcfce7' }} /> : null}</div></td>
                  <td style={{ ...cellStyle, width: 548 }}><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block', width:'100%',  }}>{row.customer_name}</span></td>
                  <td style={{ ...cellStyle, width: 116 }}><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block', width:'100%',  }}>{row.source_request_no || '-'}</span></td>
                  <td style={{ ...cellStyle, width: 90 }}><StatusBadge label={row.status} /></td>
                  <td style={{ ...cellStyle, whiteSpace: 'nowrap', width: 64 }}>Rev. {row.revision_no}</td>
                  <td style={{ ...cellStyle, width: 38 }}>{row.section_count || 0}</td>
                  <td style={{ ...cellStyle, fontWeight: 900, color: '#7a150f', whiteSpace: 'nowrap', width: 108 }}>{money(row.grand_total, row.currency || 'EUR')}</td>
                  <td style={{ ...cellStyle, width: 88 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                      <button style={primaryButton} onClick={() => navigate(`/offers/${row.id}`)}>Detay</button>
                      {row.status === 'APPROVED' ? <button style={dangerButton} onClick={() => setSelected(row)}>İptal Et</button> : null}
                      {row.status === 'CANCELLED' ? <button style={dangerButton} onClick={() => setSelected(row)}>Sil</button> : null}
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
            <div style={{ fontSize: 24, fontWeight: 900, color: '#111827' }}>{selected.status === 'APPROVED' ? 'Onaylı teklifi iptal et' : 'İptal edilen teklifi pasife al'}</div>
            <div style={{ color: '#475569', lineHeight: 1.6 }}>
              {selected.status === 'APPROVED' ? (
                <><strong>{selected.offer_no}</strong> numaralı onaylı teklif iptal edilecek. Bu kayıt ana teklif listesine geri dönmeyecek ve bu tekliften yeni protokol oluşturulamayacak.</>
              ) : (
                <><strong>{selected.offer_no}</strong> numaralı iptal edilmiş teklif listeden pasife alınacak. Kayıt silinmeyecek, sadece onaylı teklifler ekranında görünmeyecek.</>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" style={ghostButton} onClick={() => setSelected(null)} disabled={submitting}>Vazgeç</button>
              <button type="button" style={dangerButton} onClick={() => void submitRowAction()} disabled={submitting}>{submitting ? 'İşlem yapılıyor...' : selected.status === 'APPROVED' ? 'İptali Onayla' : 'Pasife Al'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
