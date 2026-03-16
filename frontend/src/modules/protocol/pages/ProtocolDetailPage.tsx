import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../../api/client'

type ProtocolTest = { id: number; test_code: string; test_name: string; is_required: boolean; is_selected: boolean }
type ProtocolDetail = {
  id: number
  protocol_no: string
  offer_no: string | null
  customer_name: string
  inspection_location_address: string | null
  source_request_no: string | null
  inspection_type_name: string
  status: string
  revision_no: number
  is_current: boolean
  is_readonly?: boolean
  snapshot?: { summary_items?: { label: string; value: string }[] }
  tests: ProtocolTest[]
}

const card: CSSProperties = { background: '#fff', borderRadius: 24, border: '1px solid #e5e7eb', padding: 20, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }
const softCard: CSSProperties = { border: '1px solid #dbe3f0', borderRadius: 22, padding: 22, background: '#fff' }
const ghostButton: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 16, background: '#fff', color: '#0f172a', padding: '14px 18px', fontWeight: 800, cursor: 'pointer' }
const redButton: CSSProperties = { border: 'none', borderRadius: 16, background: '#cf1b1b', color: '#fff', padding: '14px 18px', fontWeight: 800, cursor: 'pointer' }
const disabledButton: CSSProperties = { ...ghostButton, cursor: 'not-allowed', opacity: 0.6 }

function statusBadge(status: string) {
  const palette: Record<string, { bg: string; fg: string; label: string }> = {
    DRAFT: { bg: '#fef3c7', fg: '#92400e', label: 'Taslak' },
    APPROVED: { bg: '#dcfce7', fg: '#166534', label: 'Onaylandı' },
    CANCELLED: { bg: '#fee2e2', fg: '#991b1b', label: 'İptal Edildi' },
  }
  const current = palette[status] || { bg: '#e2e8f0', fg: '#334155', label: status }
  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', borderRadius: 999, background: current.bg, color: current.fg, fontWeight: 800 }}>{current.label}</span>
}

export default function ProtocolDetailPage() {
  const { protocolId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ProtocolDetail | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState<'APPROVED' | 'CANCELLED' | null>(null)

  const load = async () => {
    try {
      const response = await apiClient.get(`/protocols/${protocolId}`)
      setDetail(response.data)
      setError('')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Protokol detayı alınamadı')
    }
  }

  useEffect(() => { void load() }, [protocolId])

  const updateStatus = async (action: 'APPROVED' | 'CANCELLED') => {
    if (detail?.is_readonly) return
    setSubmitting(action)
    try {
      await apiClient.post(`/protocols/${protocolId}/${action === 'APPROVED' ? 'approve' : 'cancel'}`)
      await load()
    } finally {
      setSubmitting(null)
    }
  }

  if (error) return <div style={{ ...card, borderColor: '#fecaca', background: '#fff1f2', color: '#991b1b' }}>{error}</div>
  if (!detail) return <div style={card}>Yükleniyor...</div>

  const readonly = Boolean(detail.is_readonly)

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {readonly ? <div style={{ ...card, borderColor: '#dbeafe', background: '#eff6ff', color: '#1d4ed8' }}>Bu protokol eski revizyondur. Sadece görüntülenebilir, düzenleme ve durum değişikliği yapılamaz.</div> : null}
      <div style={{ ...card, display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#081734' }}>{detail.protocol_no}</div>
            <div style={{ marginTop: 8, color: '#5a7396', fontSize: 18 }}>{detail.customer_name} · Teklif: {detail.offer_no || '-'}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {statusBadge(detail.status)}
            {!readonly && detail.status !== 'APPROVED' ? <button style={redButton} disabled={submitting !== null} onClick={() => void updateStatus('APPROVED')}>{submitting === 'APPROVED' ? 'Onaylanıyor...' : 'Protokolü Onayla'}</button> : null}
            {!readonly && detail.status !== 'CANCELLED' ? <button style={ghostButton} disabled={submitting !== null} onClick={() => void updateStatus('CANCELLED')}>{submitting === 'CANCELLED' ? 'İptal ediliyor...' : 'İptal Et'}</button> : null}
            {readonly ? <button style={disabledButton} disabled>Salt Okunur</button> : null}
            <button style={ghostButton} onClick={() => navigate('/protocols')}>Listeye Dön</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', gap: 16 }}>
          <div style={softCard}><div style={{ color: '#5a7396' }}>Muayene Türü</div><div style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>{detail.inspection_type_name}</div></div>
          <div style={softCard}><div style={{ color: '#5a7396' }}>Kaynak Talep</div><div style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>{detail.source_request_no || '-'}</div></div>
          <div style={softCard}><div style={{ color: '#5a7396' }}>Adres</div><div style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>{detail.inspection_location_address || '-'}</div></div>
          <div style={softCard}><div style={{ color: '#5a7396' }}>Revizyon</div><div style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>Rev. {detail.revision_no}</div></div>
        </div>
      </div>

      <div style={{ ...card, display: 'grid', gap: 18 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#081734' }}>Frozen Snapshot Özeti</div>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {(detail.snapshot?.summary_items || []).map((item, index) => (
            <div key={index} style={softCard}><div style={{ color: '#5a7396' }}>{item.label}</div><div style={{ marginTop: 6, fontWeight: 800 }}>{item.value || '-'}</div></div>
          ))}
          {!(detail.snapshot?.summary_items || []).length ? <div style={softCard}>Bu protokol tekliften üretilmiştir. Özet veri henüz bulunmuyor.</div> : null}
        </div>
      </div>

      <div style={{ ...card, display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#081734' }}>Protokol Testleri</div>
          <div style={{ color: '#64748b' }}>{readonly ? 'Eski revizyon salt okunur.' : 'Güncel protokol üzerinde işlem yapılabilir.'}</div>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {(detail.tests || []).map((test) => (
            <div key={test.id} style={{ ...softCard, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#081734' }}>{test.test_name}</div>
                <div style={{ marginTop: 6, color: '#5a7396' }}>{test.test_code}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', padding: '8px 12px', borderRadius: 999, background: test.is_selected ? '#dcfce7' : '#f1f5f9', color: test.is_selected ? '#166534' : '#475569', fontWeight: 800 }}>{test.is_selected ? 'Seçili' : 'Pasif'}</span>
                <span style={{ display: 'inline-flex', padding: '8px 12px', borderRadius: 999, background: test.is_required ? '#dbeafe' : '#fef3c7', color: test.is_required ? '#1d4ed8' : '#92400e', fontWeight: 800 }}>{test.is_required ? 'Gerekli' : 'Opsiyonel'}</span>
              </div>
            </div>
          ))}
          {!detail.tests.length ? <div style={softCard}>Bu protokol için test bulunamadı.</div> : null}
        </div>
      </div>
    </div>
  )
}
