import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../../api/client'

type OfferTest = { id: number; test_code: string; test_name: string; is_requested: boolean; display_order: number }
type OfferSection = {
  id: number
  section_no: number
  inspection_type_code: string
  inspection_type_name: string
  section_title: string
  summary_items: { label: string; value: string }[]
  service_price: number
  travel_price: number
  report_price: number
  subtotal: number
  estimated_days?: number | null
  tests: OfferTest[]
}
type ProtocolDraft = { id: number; protocol_no: string; offer_section_id: number; inspection_type_name: string; tests_count: number }
type RevisionHistoryItem = { id: number; revision_no: number; revision_status: string; is_current: boolean; status: string; grand_total: number; section_count: number; created_at: string | null }
type OfferDetail = {
  id: number
  offer_no: string
  customer_name: string
  inspection_location_address: string | null
  source_request_no: string
  status: string
  revision_no: number
  is_current: boolean
  grand_total: number
  vat_amount?: number
  grand_total_with_vat?: number
  currency?: string
  vat_rate?: number
  extra_day_fee?: number
  authorized_person_name?: string | null
  approved_offer_file_name?: string | null
  has_approved_offer_file?: boolean
  section_count: number
  sections: OfferSection[]
  protocol_drafts: ProtocolDraft[]
  revision_history: RevisionHistoryItem[]
}

const card: CSSProperties = { background: '#fff', borderRadius: 24, border: '1px solid #e5e7eb', padding: 20, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }
const softCard: CSSProperties = { border: '1px solid #dbe3f0', borderRadius: 22, padding: 22, background: '#fff' }
const redButton: CSSProperties = { border: 'none', borderRadius: 16, background: '#cf1b1b', color: '#fff', padding: '14px 18px', fontWeight: 800, cursor: 'pointer' }
const ghostButton: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 16, background: '#fff', color: '#0f172a', padding: '14px 18px', fontWeight: 800, cursor: 'pointer' }
const linkButton: CSSProperties = { border: '1px solid #fecaca', borderRadius: 14, background: '#fff7f7', color: '#b42318', padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }
const inputStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 18, border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: 16, minHeight: 54 }

function money(value?: number, currency: string = 'EUR') {
  const normalized = currency === 'TL' ? 'TRY' : currency
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: normalized as 'TRY' | 'USD' | 'EUR' }).format(value || 0)
}

function durumRozeti(status: string) {
  const labelMap: Record<string, string> = { DRAFT: 'Taslak', APPROVED: 'Onaylandı', REJECTED: 'Reddedildi', CURRENT: 'Güncel', SUPERSEDED: 'Eski Revizyon', SENT: 'Gönderildi' }
  const palette: Record<string, { bg: string; fg: string }> = {
    DRAFT: { bg: '#fef3c7', fg: '#92400e' },
    APPROVED: { bg: '#dcfce7', fg: '#166534' },
    REJECTED: { bg: '#fee2e2', fg: '#991b1b' },
    SUPERSEDED: { bg: '#e5e7eb', fg: '#334155' },
    CURRENT: { bg: '#dcfce7', fg: '#166534' },
    SENT: { bg: '#dbeafe', fg: '#1d4ed8' },
  }
  const p = palette[status] || { bg: '#e2e8f0', fg: '#334155' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 92, padding: '10px 14px', borderRadius: 999, background: p.bg, color: p.fg, fontWeight: 800, fontSize: 13 }}>{labelMap[status] || status}</span>
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export default function OfferDetailPage() {
  const { offerId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [detail, setDetail] = useState<OfferDetail | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' }>({ text: '', kind: 'success' })
  const [pricing, setPricing] = useState<Record<number, { service_price: string; travel_price: string; report_price: string; estimated_days: string; discount_rate: string }>>({})
  const [documentFields, setDocumentFields] = useState({ currency: 'EUR', vat_rate: '20', extra_day_fee: '500', discount_rate: '0', authorized_person_name: 'Mehmet ACAR' })
  const [savingSectionId, setSavingSectionId] = useState<number | null>(null)
  const [savingDocumentFields, setSavingDocumentFields] = useState(false)
  const [creatingProtocols, setCreatingProtocols] = useState(false)
  const [downloadingType, setDownloadingType] = useState<'docx' | 'pdf' | null>(null)
  const [uploadingApproved, setUploadingApproved] = useState(false)
  const [approving, setApproving] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [loadingPdfPreview, setLoadingPdfPreview] = useState(false)
  const [deletingApprovedFile, setDeletingApprovedFile] = useState(false)

  useEffect(() => {
    if (!toast.text) return
    const timer = window.setTimeout(() => setToast((current) => ({ ...current, text: '' })), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const load = async () => {
    try {
      const response = await apiClient.get(`/offers/${offerId}`)
      const item = response.data as OfferDetail
      setDetail(item)
      const savedDiscountRate = typeof window !== 'undefined' ? window.localStorage.getItem(`offer-discount-rate:${item.id}`) : null
      setDocumentFields({
        currency: item.currency || 'EUR',
        vat_rate: String(item.vat_rate ?? 20),
        extra_day_fee: String(item.extra_day_fee ?? 500),
        discount_rate: String((item as any).discount_rate ?? savedDiscountRate ?? 0),
        authorized_person_name: item.authorized_person_name || 'Mehmet ACAR',
      })
      setPricing(Object.fromEntries((item.sections || []).map((section) => [section.id, {
        service_price: String(section.service_price || 0),
        travel_price: String(section.travel_price || 0),
        report_price: String(section.report_price || 0),
        estimated_days: section.estimated_days == null ? '' : String(section.estimated_days),
        discount_rate: String((section as any).discount_rate ?? 0),
      }])))
      setError('')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Teklif detayı alınamadı')
    }
  }

  useEffect(() => { void load() }, [offerId])

  useEffect(() => {
    if (!detail?.sections?.length) return
    if (activeSectionId && detail.sections.some((section) => section.id === activeSectionId)) return
    setActiveSectionId(detail.sections[0].id)
  }, [detail, activeSectionId])

  const protocolBySectionId = useMemo(() => Object.fromEntries((detail?.protocol_drafts || []).map((draft) => [draft.offer_section_id, draft])), [detail])

  const savePricing = async (sectionId: number) => {
    setSavingSectionId(sectionId)
    try {
      const current = pricing[sectionId] || { service_price: '0', travel_price: '0', report_price: '0', estimated_days: '', discount_rate: '0' }
      await apiClient.put(`/offers/${offerId}/sections/${sectionId}/pricing`, {
        service_price: Number(current.service_price || 0),
        travel_price: Number(current.travel_price || 0),
        report_price: Number(current.report_price || 0),
        estimated_days: current.estimated_days === '' ? null : Number(current.estimated_days),
        discount_rate: Number(current.discount_rate || 0),
      })
      setToast({ text: 'Bölüm bilgileri kaydedildi.', kind: 'success' })
      await load()
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'Bölüm bilgileri kaydedilemedi.', kind: 'error' })
    } finally {
      setSavingSectionId(null)
    }
  }

  const saveDocumentFields = async () => {
    setSavingDocumentFields(true)
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`offer-discount-rate:${offerId}`, documentFields.discount_rate || '0')
      }
      await apiClient.put(`/offers/${offerId}/document-fields`, {
        currency: documentFields.currency,
        vat_rate: Number(documentFields.vat_rate || 20),
        extra_day_fee: Number(documentFields.extra_day_fee || 500),
        discount_rate: Number(documentFields.discount_rate || 0),
        authorized_person_name: documentFields.authorized_person_name || 'Mehmet ACAR',
      })
      setToast({ text: 'Belge alanları kaydedildi.', kind: 'success' })
      await load()
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'Belge alanları kaydedilemedi.', kind: 'error' })
    } finally {
      setSavingDocumentFields(false)
    }
  }

  const ensureProtocols = async () => {
    setCreatingProtocols(true)
    try {
      await apiClient.post(`/offers/${offerId}/protocol-drafts`)
      setToast({ text: 'Protokol taslakları oluşturuldu.', kind: 'success' })
      await load()
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'Protokol taslakları oluşturulamadı.', kind: 'error' })
    } finally {
      setCreatingProtocols(false)
    }
  }

  const onayla = async () => {
    setApproving(true)
    try {
      await apiClient.post(`/offers/${offerId}/approve`)
      setToast({ text: 'Teklif onaylandı.', kind: 'success' })
      await load()
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'Teklif onaylanamadı.', kind: 'error' })
    } finally {
      setApproving(false)
    }
  }

  const uploadApprovedFile = async (file?: File | null) => {
    if (!file) return
    setUploadingApproved(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await apiClient.post(`/offers/${offerId}/approved-file`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setToast({ text: 'İmzalı teklif dosyası yüklendi.', kind: 'success' })
      await load()
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'Dosya yüklenemedi.', kind: 'error' })
    } finally {
      setUploadingApproved(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const previewApprovedFile = async () => {
    setLoadingPdfPreview(true)
    try {
      const response = await apiClient.get(`/offers/${offerId}/approved-file`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      if (pdfPreviewUrl) window.URL.revokeObjectURL(pdfPreviewUrl)
      setPdfPreviewUrl(url)
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'Onaylı teklif dosyası görüntülenemedi.', kind: 'error' })
    } finally {
      setLoadingPdfPreview(false)
    }
  }

  const deleteApprovedFile = async () => {
    setDeletingApprovedFile(true)
    try {
      await apiClient.delete(`/offers/${offerId}/approved-file`)
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl)
        setPdfPreviewUrl(null)
      }
      setToast({ text: 'Onaylı teklif dosyası silindi.', kind: 'success' })
      await load()
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'Onaylı teklif dosyası silinemedi.', kind: 'error' })
    } finally {
      setDeletingApprovedFile(false)
    }
  }

  const downloadFile = async (kind: 'docx' | 'pdf') => {
    setDownloadingType(kind)
    try {
      const response = await apiClient.post(`/offers/${offerId}/generate-${kind}`, {}, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: response.headers['content-type'] || (kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const disposition = String(response.headers['content-disposition'] || '')
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/) 
      link.download = filenameMatch?.[1] || `${detail?.offer_no || 'teklif'}.${kind}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setToast({ text: `Teklif ${kind.toUpperCase()} dosyası hazırlandı.`, kind: 'success' })
    } catch (err: any) {
      setToast({ text: err?.response?.data?.detail || 'Teklif dosyası oluşturulamadı.', kind: 'error' })
    } finally {
      setDownloadingType(null)
    }
  }

  if (error) return <div style={{ ...card, borderColor: '#fecaca', background: '#fff1f2', color: '#991b1b' }}>{error}</div>
  if (!detail) return <div style={card}>Yükleniyor...</div>

  const readonly = !detail.is_current || detail.status === 'CANCELLED' || detail.status === 'APPROVED'
  const liveSections = (detail.sections || []).map((section) => {
    const current = pricing[section.id] || { service_price: '0', travel_price: '0', report_price: '0', estimated_days: '', discount_rate: '0' }
    const liveSubtotal = Number(current.service_price || 0) + Number(current.travel_price || 0) + Number(current.report_price || 0)
    const sectionDiscountRate = Math.max(Number(current.discount_rate || 0), 0)
    const sectionDiscountAmount = (liveSubtotal * sectionDiscountRate) / 100
    const liveNetSubtotal = Math.max(liveSubtotal - sectionDiscountAmount, 0)
    return { ...section, liveSubtotal, sectionDiscountRate, sectionDiscountAmount, liveNetSubtotal }
  })
  const subtotalBeforeDiscount = liveSections.reduce((sum, section) => sum + section.liveSubtotal, 0)
  const sectionDiscountAmountTotal = liveSections.reduce((sum, section) => sum + section.sectionDiscountAmount, 0)
  const extraDayFeeTotal = liveSections.reduce((sum, section) => sum + Math.max(Number(pricing[section.id]?.estimated_days || 0), 0) * Number(documentFields.extra_day_fee || 0), 0)
  const discountRate = Math.max(Number(documentFields.discount_rate || 0), 0)
  const globalDiscountAmount = ((Math.max(subtotalBeforeDiscount - sectionDiscountAmountTotal, 0) + extraDayFeeTotal) * discountRate) / 100
  const discountAmount = sectionDiscountAmountTotal + globalDiscountAmount
  const vatBase = Math.max(subtotalBeforeDiscount - sectionDiscountAmountTotal + extraDayFeeTotal - globalDiscountAmount, 0)
  const vatAmount = vatBase * (Math.max(Number(documentFields.vat_rate || 0), 0) / 100)
  const grandTotalWithVat = vatBase + vatAmount

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {readonly ? <div style={{ ...card, borderColor: '#dbeafe', background: '#eff6ff', color: '#1d4ed8' }}>{detail.status === 'CANCELLED' ? 'Bu teklif iptal edilmiştir. Ana listeye dönmez ve bu kayıttan yeni protokol oluşturulamaz.' : 'Bu teklif onaylıdır. Düzenleme yerine yalnızca görüntüleme yapılabilir.'}</div> : null}
      <div style={{ ...card, display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#081734', lineHeight: 1 }}>{detail.offer_no}</div>
            <div style={{ marginTop: 10, color: '#5a7396', fontSize: 18 }}>{detail.customer_name} · Kaynak talep: {detail.source_request_no}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {durumRozeti(detail.status)}
            {durumRozeti(detail.is_current ? 'CURRENT' : 'SUPERSEDED')}
            <button style={ghostButton} onClick={() => navigate('/offers')}>Listeye Dön</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 2fr) minmax(170px, 1fr) minmax(170px, 1fr) minmax(240px, 1.35fr)', gap: 16, alignItems: 'stretch' }}>
          <div style={{ ...softCard, minHeight: 170 }}><div style={{ color: '#5a7396' }}>Adres</div><div style={{ marginTop: 10, fontWeight: 800, fontSize: 18, lineHeight: 1.45, color: '#081734', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{detail.inspection_location_address || '-'}</div></div>
          <div style={{ ...softCard, minHeight: 170 }}><div style={{ color: '#5a7396' }}>Bölüm Sayısı</div><div style={{ marginTop: 10, fontWeight: 900, fontSize: 32, color: '#081734' }}>{detail.section_count}</div></div>
          <div style={{ ...softCard, minHeight: 170 }}><div style={{ color: '#5a7396' }}>İskonto</div><div style={{ marginTop: 10, fontWeight: 900, fontSize: 24, color: '#081734' }}>{documentFields.discount_rate || '0'}%</div><div style={{ marginTop: 6, color: '#64748b' }}>{money(discountAmount, detail.currency || 'EUR')}</div></div>
          <div style={{ ...softCard, minHeight: 170, background: '#fff7f7', borderColor: '#f8d2d2' }}><div style={{ color: '#b42318' }}>KDV Dahil Toplam</div><div style={{ marginTop: 10, fontWeight: 900, fontSize: 24, color: '#7a150f' }}>{money(grandTotalWithVat, detail.currency || 'EUR')}</div></div>
        </div>
      </div>

      {toast.text ? (
        <div
          style={{
            position: 'fixed',
            right: 24,
            top: 24,
            zIndex: 1200,
            minWidth: 320,
            maxWidth: 460,
            padding: 14,
            borderRadius: 18,
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
            border: toast.kind === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
            background: toast.kind === 'success' ? '#f0fdf4' : '#fff7f7',
            color: toast.kind === 'success' ? '#166534' : '#991b1b',
            fontWeight: 800,
          }}
        >
          {toast.text}
        </div>
      ) : null}

      <div style={{ ...card, display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#081734' }}>Teklif Belge Alanları</div>
            <div style={{ marginTop: 6, color: '#64748b' }}>Kurumsal PDF için para birimi, KDV, günlük ek bedel ve yetkili bilgilerini buradan kaydet.</div>
          </div>
          <button style={redButton} onClick={() => void saveDocumentFields()} disabled={savingDocumentFields || readonly}>{savingDocumentFields ? 'Kaydediliyor...' : 'Belge Alanlarını Kaydet'}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
          <label style={{ display: 'grid', gap: 8 }}><span style={{ color: '#475569', fontSize: 15 }}>Para Birimi</span><select disabled={readonly} value={documentFields.currency} onChange={(event) => setDocumentFields((current) => ({ ...current, currency: event.target.value }))} style={inputStyle}><option value="EUR">EUR</option><option value="TRY">TRY</option><option value="USD">USD</option></select></label>
          <label style={{ display: 'grid', gap: 8 }}><span style={{ color: '#475569', fontSize: 15 }}>KDV Oranı (%)</span><input disabled={readonly} type="number" value={documentFields.vat_rate} onChange={(event) => setDocumentFields((current) => ({ ...current, vat_rate: event.target.value }))} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 8 }}><span style={{ color: '#475569', fontSize: 15 }}>Günlük Ek Hizmet Bedeli</span><input disabled={readonly} type="number" value={documentFields.extra_day_fee} onChange={(event) => setDocumentFields((current) => ({ ...current, extra_day_fee: event.target.value }))} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 8 }}><span style={{ color: '#475569', fontSize: 15 }}>İskonto Oranı (%)</span><input disabled={readonly} type="number" min="0" max="100" value={documentFields.discount_rate} onChange={(event) => setDocumentFields((current) => ({ ...current, discount_rate: event.target.value }))} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 8 }}><span style={{ color: '#475569', fontSize: 15 }}>ACCURATE Yetkili</span><input disabled={readonly} value={documentFields.authorized_person_name} onChange={(event) => setDocumentFields((current) => ({ ...current, authorized_person_name: event.target.value }))} style={inputStyle} /></label>
        </div>
      </div>

      <div style={{ ...card, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#081734' }}>Teklif İşlemleri</div>
            <div style={{ marginTop: 6, color: '#64748b' }}>Teklifi üret, imzalı dosyayı yükle ve onay sürecini yönet.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={redButton} onClick={() => void downloadFile('pdf')} disabled={downloadingType !== null}>{downloadingType === 'pdf' ? 'Hazırlanıyor...' : 'Teklif PDF Oluştur'}</button>
            <button style={softCard ? linkButton : linkButton} onClick={() => fileInputRef.current?.click()} disabled={uploadingApproved || readonly}>{uploadingApproved ? 'Yükleniyor...' : 'İmzalı Teklif Yükle'}</button>
            {detail.status !== 'APPROVED' && detail.status !== 'CANCELLED' && detail.is_current ? <button style={softButtonLike} onClick={() => void onayla()} disabled={approving}>{approving ? 'Onaylanıyor...' : 'Teklifi Onayla'}</button> : null}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(event) => void uploadApprovedFile(event.target.files?.[0])} />
        {detail.has_approved_offer_file ? <div style={{ ...softCard, padding: 14, color: '#166534', background: '#f0fdf4', borderColor: '#bbf7d0', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><div>Yüklü onaylı teklif dosyası: {detail.approved_offer_file_name}</div><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button style={ghostButton} onClick={() => void previewApprovedFile()} disabled={loadingPdfPreview}>{loadingPdfPreview ? 'Açılıyor...' : 'Dosyayı Görüntüle'}</button><button style={linkButton} onClick={() => void deleteApprovedFile()} disabled={deletingApprovedFile}>{deletingApprovedFile ? 'Siliniyor...' : 'Sil'}</button></div></div> : null}
      </div>

      <div style={{ ...card, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#081734' }}>Protokol Bağlantıları</div>
            <div style={{ marginTop: 6, color: '#64748b' }}>Teklif içindeki her bölüm için üretilen protokol taslakları burada görüntülenir.</div>
          </div>
          {detail.protocol_drafts.length ? <button style={ghostButton} onClick={() => navigate('/protocols')}>Protokollere Git</button> : <button style={redButton} onClick={() => void ensureProtocols()} disabled={creatingProtocols || readonly}>{creatingProtocols ? 'Oluşturuluyor...' : 'Protokol Taslaklarını Oluştur'}</button>}
        </div>
        {detail.protocol_drafts.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {detail.protocol_drafts.map((draft) => (
              <div key={draft.id} style={{ ...softCard, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 900, color: '#081734' }}>{draft.protocol_no}</div>
                  <div style={{ marginTop: 6, color: '#5a7396' }}>{draft.inspection_type_name} · {draft.tests_count} test</div>
                </div>
                <button style={linkButton} onClick={() => navigate(`/protocols/${draft.id}`)}>Protokole Git</button>
              </div>
            ))}
          </div>
        ) : <div style={{ ...softCard, color: '#64748b' }}>Bu teklif için henüz gerçek protokol taslağı oluşturulmadı.</div>}
      </div>

      <div style={{ ...card, display: 'grid', gap: 14 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#081734' }}>Revizyon Geçmişi</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {(detail.revision_history || []).map((item) => (
            <div key={item.id} style={{ ...softCard, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: 16 }}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 900, color: '#081734' }}>Rev. {item.revision_no}</div>
                <div style={{ color: '#64748b' }}>{formatDate(item.created_at)} · {item.section_count} bölüm · {money(item.grand_total, detail.currency || 'EUR')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {durumRozeti(item.status)}
                {durumRozeti(item.is_current ? 'CURRENT' : item.revision_status)}
                {item.id !== detail.id ? <button style={ghostButton} onClick={() => navigate(`/offers/${item.id}`)}>Aç</button> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {liveSections.map((section) => {
        const expanded = activeSectionId === section.id
        return (
          <div key={section.id} style={{ ...card, display: 'grid', gap: 18 }}>
            <button
              type="button"
              onClick={() => setActiveSectionId(section.id)}
              style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#081734' }}>{section.section_title}</div>
                  <div style={{ marginTop: 6, color: '#5a7396' }}>{section.inspection_type_name}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>{expanded ? 'Açık' : 'Kapalı'}</span>
                  {protocolBySectionId[section.id] ? (
                    <button
                      style={linkButton}
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/protocols/${protocolBySectionId[section.id].id}`)
                      }}
                    >
                      {protocolBySectionId[section.id].protocol_no}
                    </button>
                  ) : (
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Protokol henüz oluşturulmadı</span>
                  )}
                </div>
              </div>
            </button>

            {expanded ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div style={softCard}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#081734' }}>Özet Bilgiler</div>
                    <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                      {(section.summary_items || []).map((item, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, borderBottom: '1px dashed #e2e8f0', paddingBottom: 10 }}>
                          <span style={{ color: '#5a7396' }}>{item.label}</span>
                          <span style={{ fontWeight: 800, color: '#081734', textAlign: 'right' }}>{String(item.value || '-')}</span>
                        </div>
                      ))}
                      {!section.summary_items.length ? <div style={{ color: '#64748b' }}>Bu bölüm için özet veri bulunmuyor.</div> : null}
                    </div>
                  </div>

                  <div style={softCard}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#081734' }}>Uygulanacak Testler</div>
                    <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                      {(section.tests || []).map((test) => (
                        <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '12px 14px', borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontWeight: 800, color: '#081734' }}>{test.test_name}</div>
                        </div>
                      ))}
                      {!section.tests.length ? <div style={{ color: '#64748b' }}>Bu bölüm için test bulunmuyor.</div> : null}
                    </div>
                  </div>
                </div>

                <div style={softCard}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#081734' }}>Fiyatlandırma</div>
                  <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 8 }}>
                      <span style={{ color: '#475569', fontSize: 15 }}>Tahmini Gün</span>
                      <input
                        disabled={readonly}
                        type="number"
                        value={(pricing[section.id] as any)?.estimated_days || ''}
                        onChange={(event) => setPricing((current) => ({ ...current, [section.id]: { ...(current[section.id] || { service_price: '0', travel_price: '0', report_price: '0', estimated_days: '', discount_rate: '0' }), estimated_days: event.target.value } }))}
                        style={inputStyle}
                      />
                    </label>
                    {[
                      ['Hizmet Bedeli', 'service_price'],
                      ['Yol / Ulaşım', 'travel_price'],
                      ['Raporlama', 'report_price'],
                    ].map(([label, key]) => (
                      <label key={key} style={{ display: 'grid', gap: 8 }}>
                        <span style={{ color: '#475569', fontSize: 15 }}>{label}</span>
                        <input
                          disabled={readonly}
                          type="number"
                          value={(pricing[section.id] as any)?.[key] || '0'}
                          onChange={(event) => setPricing((current) => ({ ...current, [section.id]: { ...(current[section.id] || { service_price: '0', travel_price: '0', report_price: '0', estimated_days: '', discount_rate: '0' }), [key]: event.target.value } }))}
                          style={inputStyle}
                        />
                      </label>
                    ))}
                    <label style={{ display: 'grid', gap: 8 }}>
                      <span style={{ color: '#475569', fontSize: 15 }}>İskonto Oranı (%)</span>
                      <input
                        disabled={readonly}
                        type="number"
                        min="0"
                        max="100"
                        value={(pricing[section.id] as any)?.discount_rate || '0'}
                        onChange={(event) => setPricing((current) => ({ ...current, [section.id]: { ...(current[section.id] || { service_price: '0', travel_price: '0', report_price: '0', estimated_days: '', discount_rate: '0' }), discount_rate: event.target.value } }))}
                        style={inputStyle}
                      />
                    </label>
                    <div style={{ borderRadius: 18, background: '#fff7f7', border: '1px solid #f8d2d2', padding: 18 }}>
                      <div style={{ color: '#b42318' }}>Bölüm Toplamı</div>
                      <div style={{ marginTop: 8, color: '#64748b' }}>Ara Toplam: {money(section.liveSubtotal, detail.currency || 'EUR')}</div>
                      <div style={{ marginTop: 4, color: '#166534' }}>İskonto: -{money(section.sectionDiscountAmount, detail.currency || 'EUR')}</div>
                      <div style={{ marginTop: 8, fontWeight: 900, fontSize: 24, color: '#7a150f' }}>{money(section.liveNetSubtotal, detail.currency || 'EUR')}</div>
                    </div>
                    <button style={redButton} onClick={() => void savePricing(section.id)} disabled={savingSectionId === section.id || readonly}>
                      {savingSectionId === section.id ? 'Kaydediliyor...' : 'Bölümü Kaydet'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
      {pdfPreviewUrl ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: 'min(1100px, 100%)', height: 'min(88vh, 900px)', display: 'grid', gridTemplateRows: 'auto 1fr', overflow: 'hidden', boxShadow: '0 24px 64px rgba(15, 23, 42, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 900, color: '#081734' }}>{detail.approved_offer_file_name || 'Onaylı Teklif PDF'}</div>
              <button style={ghostButton} onClick={() => { if (pdfPreviewUrl) window.URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null) }}>Kapat</button>
            </div>
            <iframe title="Onaylı Teklif Dosyayı Görüntüleme" src={pdfPreviewUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

const softButtonLike: CSSProperties = { border: '1px solid #bbf7d0', borderRadius: 16, background: '#f0fdf4', color: '#166534', padding: '14px 18px', fontWeight: 800, cursor: 'pointer' }
