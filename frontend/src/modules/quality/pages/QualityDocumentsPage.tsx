import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { apiClient } from '../../../api/client'

type Category = {
  id: number
  code: string
  name: string
}

type RowItem = {
  id: number
  category_id: number
  category_name: string
  is_active: boolean
  latest_revision_status?: string | null
  [key: string]: unknown
}

type RevisionItem = {
  id: number
  revision_no: string
  revision_date: string | null
  effective_date: string | null
  last_review_date: string | null
  change_summary: string
  notes: string
  distribution_text: string
  status: string
  published_by: string | null
  published_at: string | null
}

type NotificationLogItem = {
  id: number
  recipient_email: string
  delivery_status: string
  error_message: string
  created_at: string | null
}

type DetailPayload = {
  editor: EditorForm
  revisions: RevisionItem[]
  notification_logs: NotificationLogItem[]
}

type EditorForm = {
  category_id: string
  document_no: string
  document_name: string
  first_publish_date: string
  revision_no: string
  revision_date: string
  last_review_date: string
  distribution_text: string
  change_summary: string
  notes: string
  is_active: boolean
}

const EXACT_HEADERS = [
  'DOK. NO',
  'DOKÜMAN ADI',
  'İLK YAY. TAR.',
  'REV. NO',
  'REV. TAR',
  'SON KONTROL TARİHİ',
  'DOKÜMAN DAĞITIM PLANI',
  'REVİZYON AÇIKLAMASI',
]

const emptyEditor = (): EditorForm => ({
  category_id: '',
  document_no: '',
  document_name: '',
  first_publish_date: '',
  revision_no: '',
  revision_date: '',
  last_review_date: '',
  distribution_text: '',
  change_summary: '',
  notes: '',
  is_active: true,
})

const cardStyle: CSSProperties = { background: '#ffffff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 20, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }
const inputStyle: CSSProperties = { width: '100%', border: '1px solid #d1d5db', borderRadius: 12, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box', background: '#fff' }
const labelStyle: CSSProperties = { display: 'grid', gap: 6, fontSize: 13, color: '#334155' }
const primaryButton: CSSProperties = { border: 0, borderRadius: 12, padding: '11px 16px', background: '#b91c1c', color: '#fff', fontWeight: 700, cursor: 'pointer' }
const secondaryButton: CSSProperties = { ...primaryButton, background: '#0f172a' }

function toDateInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('tr-TR').format(date)
}

function statusBadge(status?: string | null) {
  const key = String(status || '').toUpperCase()
  const labelMap: Record<string, string> = { PUBLISHED: 'YAYINLANDI', DRAFT: 'TASLAK', SUPERSEDED: 'ESKİ REVİZYON', PENDING: 'BEKLİYOR', SENT: 'GÖNDERİLDİ' }
  const palette: Record<string, { bg: string; fg: string }> = {
    PUBLISHED: { bg: '#dcfce7', fg: '#166534' },
    DRAFT: { bg: '#fef3c7', fg: '#92400e' },
    SUPERSEDED: { bg: '#e5e7eb', fg: '#374151' },
    PENDING: { bg: '#dbeafe', fg: '#1d4ed8' },
    SENT: { bg: '#dcfce7', fg: '#166534' },
  }
  const pick = palette[key] || { bg: '#fee2e2', fg: '#991b1b' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: pick.bg, color: pick.fg, fontSize: 12, fontWeight: 700 }}>{labelMap[key] || (status || 'YOK')}</span>
}

export default function QualityDocumentsPage() {
  const [headers, setHeaders] = useState<string[]>(EXACT_HEADERS)
  const [rows, setRows] = useState<RowItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState({ total_documents: 0, active_documents: 0, published_revisions: 0, draft_or_pending: 0 })
  const [search, setSearch] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [categoryId, setCategoryId] = useState<string>('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<DetailPayload | null>(null)
  const [editor, setEditor] = useState<EditorForm>(emptyEditor())
  const [softwareExplanation, setSoftwareExplanation] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [excelFile, setExcelFile] = useState<File | null>(null)

  const selectedRow = useMemo(() => rows.find((item) => item.id === selectedId) || null, [rows, selectedId])

  async function loadOverview(keepSelectionId?: number | null) {
    setLoading(true); setError('')
    try {
      const response = await apiClient.get('/quality/overview', { params: { search: search || undefined, active_only: activeOnly || undefined, category_id: categoryId || undefined } })
      setHeaders(response.data.headers || EXACT_HEADERS)
      setRows(response.data.rows || [])
      setCategories(response.data.categories || [])
      setStats(response.data.stats || { total_documents: 0, active_documents: 0, published_revisions: 0, draft_or_pending: 0 })
      if (keepSelectionId) {
        const exists = (response.data.rows || []).some((item: RowItem) => item.id === keepSelectionId)
        if (!exists) setSelectedId(null)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Kalite doküman listesi alınamadı')
    } finally { setLoading(false) }
  }

  async function loadDetail(documentId: number) {
    setSelectedId(documentId); setError('')
    try {
      const response = await apiClient.get(`/quality/documents/${documentId}/detail`)
      const payload = response.data as DetailPayload
      setDetail(payload)
      setEditor({
        category_id: String(payload.editor.category_id || ''), document_no: payload.editor.document_no || '', document_name: payload.editor.document_name || '', first_publish_date: toDateInput(payload.editor.first_publish_date), revision_no: payload.editor.revision_no || '', revision_date: toDateInput(payload.editor.revision_date), last_review_date: toDateInput(payload.editor.last_review_date), distribution_text: payload.editor.distribution_text || '', change_summary: payload.editor.change_summary || '', notes: payload.editor.notes || '', is_active: Boolean(payload.editor.is_active),
      })
      setSoftwareExplanation('')
    } catch (err: any) { setError(err?.response?.data?.detail || 'Doküman detayı alınamadı') }
  }

  useEffect(() => { loadOverview(selectedId) }, [activeOnly, categoryId])

  function resetForNewDocument() {
    setSelectedId(null)
    setDetail({ editor: emptyEditor(), revisions: [], notification_logs: [] })
    setEditor({ ...emptyEditor(), category_id: categories[0] ? String(categories[0].id) : '' })
    setSoftwareExplanation(''); setError(''); setSuccess('Yeni doküman modu açıldı')
  }

  function buildPayload() {
    return { category_id: Number(editor.category_id), document_no: editor.document_no, document_name: editor.document_name, first_publish_date: editor.first_publish_date || null, revision_no: editor.revision_no || '', revision_date: editor.revision_date || null, last_review_date: editor.last_review_date || null, distribution_text: editor.distribution_text, change_summary: editor.change_summary, notes: editor.notes, is_active: editor.is_active }
  }

  async function handleImport() {
    if (!excelFile) { setError('Önce LT.03 Excel dosyasını seç'); return }
    setImporting(true); setError(''); setSuccess('')
    try {
      const formData = new FormData(); formData.append('file', excelFile)
      const response = await apiClient.post('/quality/import-lt03-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      await loadOverview(selectedId)
      setSuccess(`Excel aktarıldı. Satır: ${response.data.imported_rows}, yeni doküman: ${response.data.created_documents}`)
    } catch (err: any) { setError(err?.response?.data?.detail || 'Excel içe aktarılamadı') } finally { setImporting(false) }
  }

  async function handleSaveRow() {
    if (!editor.category_id) { setError('Kategori seç'); return }
    if ((editor.revision_no && !editor.revision_date) || (!editor.revision_no && editor.revision_date)) { setError('Revizyon No ve Revizyon Tarihi birlikte girilmelidir'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const payload = buildPayload()
      if (selectedId) {
        await apiClient.put(`/quality/documents/${selectedId}/row`, payload)
        await loadOverview(selectedId); await loadDetail(selectedId); setSuccess('Kayıt güncellendi')
      } else {
        const response = await apiClient.post('/quality/documents/row', payload)
        const newId = response.data?.document?.id || response.data?.table_row?.id || response.data?.id
        await loadOverview(newId)
        if (newId) await loadDetail(newId)
        setSuccess('Yeni doküman eklendi')
      }
    } catch (err: any) { setError(err?.response?.data?.detail || 'Kayıt kaydedilemedi') } finally { setSaving(false) }
  }

  async function handlePublishRevision() {
    if (!selectedId) { setError('Önce mevcut bir doküman seç ve kaydet'); return }
    if (!editor.revision_no.trim()) { setError('Revizyon No zorunludur'); return }
    if (!editor.revision_date) { setError('Revizyon Tarihi zorunludur'); return }
    if (!softwareExplanation.trim()) { setError('Personel Bildirim Açıklaması zorunludur'); return }
    setPublishing(true); setError(''); setSuccess('')
    try {
      await apiClient.post(`/quality/documents/${selectedId}/publish-row-revision`, { ...buildPayload(), software_explanation: softwareExplanation, published_by: 'system' })
      await loadOverview(selectedId); await loadDetail(selectedId); setSoftwareExplanation(''); setSuccess('Revizyon yayınlandı ve bildirim kaydı oluşturuldu')
    } catch (err: any) { setError(err?.response?.data?.detail || 'Revizyon yayınlanamadı') } finally { setPublishing(false) }
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, color: '#111827' }}>Kalite Doküman Listesi + Revizyon Yönetimi</h1>
          <div style={{ color: '#6b7280', marginTop: 6 }}>Liste tam sayfa görünür. Manuel ekleme, satır düzenleme ve revizyon bildirimi bu ekrandan yapılır.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept=".xlsx,.xlsm,.xltx,.xltm" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
          <button style={primaryButton} onClick={handleImport} disabled={importing}>{importing ? 'Aktarılıyor...' : 'Excelden Otomatik Çek'}</button>
          <button style={secondaryButton} onClick={resetForNewDocument}>Manuel Doküman Ekle</button>
        </div>
      </div>

      {error ? <div style={{ ...cardStyle, borderColor: '#fecaca', background: '#fff1f2', color: '#991b1b' }}>{error}</div> : null}
      {success ? <div style={{ ...cardStyle, borderColor: '#bbf7d0', background: '#f0fdf4', color: '#166534' }}>{success}</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        {[['Toplam Doküman', String(stats.total_documents)], ['Aktif Doküman', String(stats.active_documents)], ['Yayınlı Revizyon', String(stats.published_revisions)], ['Taslak / Bekleyen', String(stats.draft_or_pending)]].map(([label, value]) => (
          <div key={label} style={cardStyle}><div style={{ color: '#6b7280', fontSize: 13 }}>{label}</div><div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: '#111827' }}>{value}</div></div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: 12, marginBottom: 16, alignItems: 'end' }}>
          <label style={labelStyle}>Arama<input style={inputStyle} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Doküman no veya adı" /></label>
          <label style={labelStyle}>Kategori
            <select style={inputStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Tümü</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10 }}><input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />Sadece aktifler</label>
          <button style={primaryButton} onClick={() => loadOverview(selectedId)} disabled={loading}>{loading ? 'Yükleniyor...' : 'Listeyi Yenile'}</button>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 14, maxHeight: 480 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1320 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr style={{ background: '#0f172a' }}>{headers.map((header) => <th key={header} style={{ color: '#fff', textAlign: 'left', padding: '14px 12px', fontSize: 12 }}>{header}</th>)}<th style={{ color: '#fff', textAlign: 'left', padding: '14px 12px', fontSize: 12 }}>KATEGORİ</th><th style={{ color: '#fff', textAlign: 'left', padding: '14px 12px', fontSize: 12 }}>DURUM</th></tr></thead>
            <tbody>
              {rows.map((row) => { const isSelected = row.id === selectedId; return <tr key={row.id} onClick={() => loadDetail(row.id)} style={{ background: isSelected ? '#fef2f2' : '#fff', cursor: 'pointer', borderTop: '1px solid #f1f5f9' }}>{headers.map((header) => <td key={`${row.id}-${header}`} style={{ padding: '12px', fontSize: 13, verticalAlign: 'top', color: '#111827' }}>{String(row[header] ?? '-')}</td>)}<td style={{ padding: '12px', fontSize: 13 }}>{String(row.category_name || '-')}</td><td style={{ padding: '12px' }}>{statusBadge((row.latest_revision_status as string | null) || null)}</td></tr> })}
              {!rows.length ? <tr><td colSpan={headers.length + 2} style={{ padding: 22, color: '#64748b', textAlign: 'center' }}>Kayıt bulunamadı</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>SATIR EDİTÖRÜ</div><div style={{ marginTop: 8, fontWeight: 800, fontSize: 22, color: '#111827' }}>{selectedRow ? `${String(selectedRow['DOK. NO'])} · ${String(selectedRow['DOKÜMAN ADI'])}` : 'Yeni doküman'}</div><div style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>Tablodaki kayda tıklayınca tüm hücreler burada düzenlenir.</div></div>
          {selectedRow ? <div>{statusBadge((selectedRow.latest_revision_status as string | null) || null)}</div> : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <label style={labelStyle}>Kategori<select style={inputStyle} value={editor.category_id} onChange={(e) => setEditor({ ...editor, category_id: e.target.value })}><option value="">Seç</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label style={labelStyle}>DOK. NO<input style={inputStyle} value={editor.document_no} onChange={(e) => setEditor({ ...editor, document_no: e.target.value })} /></label>
          <label style={labelStyle}>DOKÜMAN ADI<input style={inputStyle} value={editor.document_name} onChange={(e) => setEditor({ ...editor, document_name: e.target.value })} /></label>
          <label style={{ ...labelStyle, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>Aktif<input type="checkbox" checked={editor.is_active} onChange={(e) => setEditor({ ...editor, is_active: e.target.checked })} /></label>
          <label style={labelStyle}>İLK YAY. TAR.<input style={inputStyle} type="date" value={editor.first_publish_date} onChange={(e) => setEditor({ ...editor, first_publish_date: e.target.value })} /></label>
          <label style={labelStyle}>REV. NO<input style={inputStyle} value={editor.revision_no} onChange={(e) => setEditor({ ...editor, revision_no: e.target.value })} /></label>
          <label style={labelStyle}>REV. TAR.<input style={inputStyle} type="date" value={editor.revision_date} onChange={(e) => setEditor({ ...editor, revision_date: e.target.value })} /></label>
          <label style={labelStyle}>SON KONTROL TARİHİ<input style={inputStyle} type="date" value={editor.last_review_date} onChange={(e) => setEditor({ ...editor, last_review_date: e.target.value })} /></label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
          <label style={labelStyle}>DOKÜMAN DAĞITIM PLANI<textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={editor.distribution_text} onChange={(e) => setEditor({ ...editor, distribution_text: e.target.value })} /></label>
          <label style={labelStyle}>Revizyon Açıklaması<textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={editor.change_summary} onChange={(e) => setEditor({ ...editor, change_summary: e.target.value })} /></label>
        </div>

        <label style={labelStyle}>İç Not<textarea style={{ ...inputStyle, minHeight: 78, resize: 'vertical' }} value={editor.notes} onChange={(e) => setEditor({ ...editor, notes: e.target.value })} /></label>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr auto auto', gap: 12, alignItems: 'end' }}>
          <label style={labelStyle}>Personel Bildirim Açıklaması<textarea style={{ ...inputStyle, minHeight: 78, resize: 'vertical' }} value={softwareExplanation} onChange={(e) => setSoftwareExplanation(e.target.value)} placeholder="Revizyon yayınlandığında personele gidecek açıklama" /></label>
          <button style={secondaryButton} onClick={handleSaveRow} disabled={saving}>{saving ? 'Kaydediliyor...' : (selectedId ? 'Seçili Kaydı Güncelle' : 'Yeni Dokümanı Kaydet')}</button>
          <button style={primaryButton} onClick={handlePublishRevision} disabled={publishing || !selectedId}>{publishing ? 'Yayınlanıyor...' : 'Revizyonu Yayınla + Bildirim'}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}><div style={{ fontWeight: 700, marginBottom: 10 }}>Revizyon Geçmişi</div><div style={{ display: 'grid', gap: 10, maxHeight: 260, overflowY: 'auto' }}>{(detail?.revisions || []).map((item) => <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fafafa' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><strong>Rev. {item.revision_no}</strong>{statusBadge(item.status)}</div><div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Revizyon: {formatDate(item.revision_date)} · Son Kontrol: {formatDate(item.last_review_date)}</div><div style={{ marginTop: 8, fontSize: 13, color: '#111827' }}>{item.change_summary || '-'}</div></div>)}{!detail?.revisions?.length ? <div style={{ color: '#64748b', fontSize: 13 }}>Revizyon kaydı yok</div> : null}</div></div>
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}><div style={{ fontWeight: 700, marginBottom: 10 }}>Bildirim / Mail Kayıtları</div><div style={{ display: 'grid', gap: 10, maxHeight: 260, overflowY: 'auto' }}>{(detail?.notification_logs || []).map((item) => <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong style={{ fontSize: 13 }}>{item.recipient_email || 'Alıcı tanımlı değil'}</strong>{statusBadge(item.delivery_status)}</div><div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{formatDate(item.created_at)}</div>{item.error_message ? <div style={{ fontSize: 12, color: '#991b1b', marginTop: 8 }}>{item.error_message}</div> : null}</div>)}{!detail?.notification_logs?.length ? <div style={{ color: '#64748b', fontSize: 13 }}>Henüz bildirim kaydı yok</div> : null}</div></div>
        </div>
      </div>
    </div>
  )
}
