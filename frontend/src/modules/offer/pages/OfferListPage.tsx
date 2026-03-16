import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../../api/client'
import { AppToast } from '../../../components/feedback/AppToast'
import { StatusBadge } from '../../../components/badges/StatusBadge'
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
  revision_status: string
  is_current: boolean
  source_request_no: string
  section_count: number
  grand_total: number
  currency?: string
  root_id?: number | null
}

const primaryButton: CSSProperties = {
  border: 'none',
  borderRadius: 10,
  background: '#991b1b',
  color: '#fff',
  padding: '8px 12px',
  fontWeight: 800,
  cursor: 'pointer',
  minWidth: 96,
  height: 42,
}

const ghostButton: CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 10,
  background: '#fff',
  color: '#111827',
  padding: '8px 12px',
  fontWeight: 800,
  cursor: 'pointer',
  minWidth: 96,
  height: 42,
}

const revisionButton: CSSProperties = {
  ...ghostButton,
  padding: '6px 10px',
  minWidth: 112,
  height: 42,
  lineHeight: 1.15,
  fontSize: 13,
}

function money(value?: number, currency: string = 'EUR') {
  const normalized = currency === 'TL' ? 'TRY' : currency
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: normalized as 'TRY' | 'USD' | 'EUR' }).format(value || 0)
}

export default function OfferListPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<OfferRow[]>([])
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' | 'info' }>({ text: '', kind: 'info' })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [revisionRows, setRevisionRows] = useState<Record<number, OfferRow[]>>({})
  const [loadingRevisionId, setLoadingRevisionId] = useState<number | null>(null)

  const load = async () => {
    try {
      const response = await apiClient.get('/offers')
      setRows(response.data.items || [])
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'Teklif verileri alınamadı', kind: 'error' })
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

  const toggleRevisions = async (offerId: number) => {
    if (expandedId === offerId) {
      setExpandedId(null)
      return
    }
    setExpandedId(offerId)
    if (revisionRows[offerId]) return
    setLoadingRevisionId(offerId)
    try {
      const response = await apiClient.get(`/offers/${offerId}/revisions`)
      setRevisionRows((current) => ({ ...current, [offerId]: response.data.items || [] }))
    } catch {
      setRevisionRows((current) => ({ ...current, [offerId]: [] }))
      setToast({ text: 'Revizyon geçmişi alınamadı', kind: 'error' })
    } finally {
      setLoadingRevisionId(null)
    }
  }

  const headers = ['Teklif No', 'Müşteri Adı', 'Talep No', 'Durum', 'Revizyon', 'Bölüm', 'Toplam', 'İşlem']

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <AppToast open={!!toast.text} text={toast.text} kind={toast.kind} />

      <div style={standardCardStyle}>
        <ListPageHeader
          title="Aktif Teklifler"
          total={filteredRows.length}
          search={search}
          searchPlaceholder="Teklif no, müşteri veya talep no ara"
          onSearchChange={setSearch}
          onClear={() => setSearch('')}
          rightSlot={<button type="button" style={ghostButton} onClick={() => navigate('/offers/approved')}>Onaylı Teklifler</button>}
        />

        <div style={standardTableWrap}>
          <table style={{ ...standardTableStyle, minWidth: 1120, tableLayout: 'fixed' }}>
            <thead>
              <tr style={darkHeaderRowStyle}>
                {headers.map((header, index) => (
                  <th key={header} style={thStyle(index, headers.length)}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const children = revisionRows[row.id] || []
                const expanded = expandedId === row.id
                return (
                  <Fragment key={row.id}>
                    <tr style={{ background: index % 2 ? '#fff' : '#fcfcfd' }}>
                      <td style={{ ...cellStyle, fontWeight: 900, color: '#081734', whiteSpace: 'nowrap', width: 150 }}>{row.offer_no}</td>
                      <td style={{ ...cellStyle, width: 410 }}>
                        <span style={{ ...ellipsisTextStyle, maxWidth: 392, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.customer_name}</span>
                      </td>
                      <td style={{ ...cellStyle, color: '#475569', width: 165 }}>
                        <span style={{ ...ellipsisTextStyle, maxWidth: 150, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.source_request_no || '-'}</span>
                      </td>
                      <td style={{ ...cellStyle, width: 118 }}><StatusBadge label={row.status} /></td>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap', width: 96 }}>Rev. {row.revision_no}</td>
                      <td style={{ ...cellStyle, fontWeight: 700, width: 72 }}>{row.section_count || 0}</td>
                      <td style={{ ...cellStyle, fontWeight: 900, color: '#7a150f', whiteSpace: 'nowrap', width: 138 }}>{money(row.grand_total, row.currency || 'EUR')}</td>
                      <td style={{ ...cellStyle, width: 140 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
                          <button style={primaryButton} onClick={() => navigate(`/offers/${row.id}`)}>Detay</button>
                          <button style={revisionButton} onClick={() => void toggleRevisions(row.id)}>
                            {expanded ? 'Gizle' : 'Eski Revizyonlar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={8} style={{ ...cellStyle, padding: 18 }}>
                          {loadingRevisionId === row.id ? (
                            <div style={{ color: '#64748b' }}>Revizyon geçmişi yükleniyor...</div>
                          ) : children.length ? (
                            <div style={{ display: 'grid', gap: 10 }}>
                              {children.map((child) => (
                                <div key={child.id} style={{ border: '1px solid #dbe3f0', background: '#fff', borderRadius: 16, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                                    <div style={{ fontWeight: 900, color: '#0f172a' }}>{child.offer_no} · Rev. {child.revision_no}</div>
                                    <div style={{ color: '#64748b', fontSize: 14, ...ellipsisTextStyle, maxWidth: 420 }}>{child.customer_name} · {money(child.grand_total, child.currency || 'EUR')}</div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <StatusBadge label={child.status} />
                                    <StatusBadge label={child.revision_status} />
                                    <button style={ghostButton} onClick={() => navigate(`/offers/${child.id}`)}>Aç</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ color: '#64748b' }}>Bu teklif için eski revizyon bulunmuyor.</div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
              {!filteredRows.length ? <tr><td colSpan={8} style={{ ...cellStyle, padding: 24, textAlign: 'center', color: '#64748b' }}>Gösterilecek aktif teklif bulunamadı.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
