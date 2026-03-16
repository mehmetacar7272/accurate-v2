import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { apiClient } from '../../../api/client'
import { AppToast } from '../../../components/feedback/AppToast'
import { ListPageHeader, cellStyle, darkHeaderRowStyle, standardTableStyle, standardTableWrap, thStyle, ellipsisTextStyle } from '../../../components/listing/ListPageHeader'

type DefinitionItem = { id:number; code:string; name:string; category:string | null; tests:Array<{ id:number | null; code:string; name:string; is_required:boolean; is_default_selected:boolean; sort_order:number }> }
type Branch = { id:number; branch_name:string; address?:string | null; is_default:boolean }
type Contact = { id:number; branch_id?:number | null; full_name:string; phone?:string | null; email?:string | null; title?:string | null; is_default:boolean }
type Customer = { id:number; customer_name:string; trade_name:string; tax_office?:string | null; tax_number?:string | null; branches:Branch[]; contacts:Contact[] }

type RequestRow = {
  id:number
  request_no:string
  customer_id?:number | null
  customer_branch_id?:number | null
  customer_contact_id?:number | null
  customer_name:string
  customer_trade_name?:string | null
  inspection_location_address?:string | null
  requested_inspection_date?:string | null
  contact_person_name?:string | null
  phone?:string | null
  email?:string | null
  tax_office?:string | null
  tax_number?:string | null
  request_status:string
  evaluation_status:string
  revision_no:number
  revision_status:string
  created_at?:string | null
  revision_reason?:string | null
  is_current:boolean
  inspection_types:string[]
}

type RequestLine = {
  id:number
  inspection_definition_id:number
  inspection_type_code:string
  inspection_type_name_snapshot:string
  schema_version?:string | null
  payload:Record<string, string>
  tests:Array<{ id:number; inspection_test_definition_id?:number | null; test_code:string; test_name_snapshot:string; is_requested:boolean; display_order:number }>
}

type EvaluationItem = { id:number; request_inspection_line_id:number; test_code?:string | null; test_name_snapshot?:string | null; suitability_status:string; unsuitable_reason?:string | null; evaluation_note?:string | null; evaluated_at?:string | null }
type OfferBridge = { message:string; current_offer?: { offer_no:string } | null }
type RevisionSummary = { id:number; request_no:string; revision_no:number; request_status:string; evaluation_status:string; revision_status:string; is_current:boolean; created_at?:string | null }
type DetailPayload = {
  request:RequestRow
  customer_ref?: { customer_id:number; branch_id?:number | null; contact_id?:number | null; customer_name:string; trade_name:string; tax_office?:string | null; tax_number?:string | null; branch_name?:string | null; address?:string | null; contact_name?:string | null; phone?:string | null; email?:string | null } | null
  lines:RequestLine[]
  evaluations:EvaluationItem[]
  offer_bridge?:OfferBridge
  revisions?:RevisionSummary[]
}

type FormBranch = { client_key:string; branch_name:string; address:string; is_default:boolean }
type FormContact = { client_key:string; branch_key:string; full_name:string; phone:string; email:string; title:string; is_default:boolean }
type CustomerCreateForm = {
  customer_name:string
  trade_name:string
  tax_office:string
  tax_number:string
  branches:FormBranch[]
  contacts:FormContact[]
}

type ToastState = { open:boolean; text:string; kind:'success' | 'error' | 'info' }

const card: CSSProperties = { background:'#fff', border:'1px solid #e5e7eb', borderRadius:20, padding:20, boxShadow:'0 12px 32px rgba(15,23,42,0.06)' }
const softCard: CSSProperties = { background:'#fff', border:'1px solid #e2e8f0', borderRadius:18, padding:18 }
const input: CSSProperties = { width:'100%', border:'1px solid #d1d5db', borderRadius:12, padding:'11px 12px', fontSize:14, boxSizing:'border-box', background:'#fff' }
const readonlyInput: CSSProperties = { ...input, background:'#f8fafc', color:'#334155' }
const textarea: CSSProperties = { ...input, minHeight:96, resize:'vertical' }
const btnPrimary: CSSProperties = { border:0, borderRadius:12, padding:'11px 16px', background:'#991b1b', color:'#fff', fontWeight:700, cursor:'pointer' }
const btnDark: CSSProperties = { ...btnPrimary, background:'#0f172a' }
const btnLight: CSSProperties = { ...btnPrimary, background:'#fff', color:'#111827', border:'1px solid #d1d5db' }
const labelStyle: CSSProperties = { display:'grid', gap:6, fontSize:13, color:'#334155' }
const helperText: CSSProperties = { color:'#64748b', fontSize:13 }

function makeKey(prefix:string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function emptyBranch(defaultValue = true): FormBranch {
  return { client_key: makeKey('branch'), branch_name: defaultValue ? 'Merkez' : '', address: '', is_default: defaultValue }
}

function emptyContact(branchKey:string, defaultValue = true): FormContact {
  return { client_key: makeKey('contact'), branch_key: branchKey, full_name: '', phone: '', email: '', title: '', is_default: defaultValue }
}

function emptyCustomerForm(): CustomerCreateForm {
  const firstBranch = emptyBranch(true)
  return {
    customer_name:'',
    trade_name:'',
    tax_office:'',
    tax_number:'',
    branches:[firstBranch],
    contacts:[emptyContact(firstBranch.client_key, true)],
  }
}

function statusLabel(text?:string | null) {
  const map: Record<string, string> = {
    DRAFT:'Taslak', SUBMITTED:'Gönderildi', UNDER_REVIEW:'İncelemede', APPROVED:'Onaylandı', REJECTED:'Reddedildi', PENDING:'Bekliyor', IN_PROGRESS:'Sürüyor', COMPLETED:'Tamamlandı', BLOCKED:'Bloklu', PENDING_APPROVAL:'Onay Bekliyor', SUPERSEDED:'Eski Revizyon', SUITABLE:'Uygun', NOT_SUITABLE:'U.D.',
  }
  return map[text || ''] || (text || 'Bilinmiyor')
}

function badgeStyle(kind:'info' | 'warn' | 'ok' | 'neutral') {
  const p = {
    info:{ bg:'#dbeafe', fg:'#1d4ed8' },
    warn:{ bg:'#fee2e2', fg:'#991b1b' },
    ok:{ bg:'#dcfce7', fg:'#166534' },
    neutral:{ bg:'#e5e7eb', fg:'#374151' },
  }[kind]
  return { display:'inline-flex', alignItems:'center', padding:'4px 10px', borderRadius:999, background:p.bg, color:p.fg, fontSize:12, fontWeight:700 } as CSSProperties
}

function mapStatus(text?:string | null) {
  const value = text || ''
  if (['APPROVED', 'COMPLETED', 'SUITABLE'].includes(value)) return <span style={badgeStyle('ok')}>{statusLabel(value)}</span>
  if (['SUBMITTED', 'UNDER_REVIEW', 'PENDING_APPROVAL', 'IN_PROGRESS'].includes(value)) return <span style={badgeStyle('info')}>{statusLabel(value)}</span>
  if (['REJECTED', 'BLOCKED', 'NOT_SUITABLE'].includes(value)) return <span style={badgeStyle('warn')}>{statusLabel(value)}</span>
  return <span style={badgeStyle('neutral')}>{statusLabel(value)}</span>
}

function formatDate(value?:string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('tr-TR').format(date)
}

function inspectionTypeBadges(items:string[]) {
  return { visible: items.slice(0, 3), hidden: items.slice(3) }
}

function inspectionTypeColor(index:number) {
  const palette = [
    { bg:'#fee2e2', fg:'#991b1b' },
    { bg:'#dbeafe', fg:'#1d4ed8' },
    { bg:'#dcfce7', fg:'#166534' },
    { bg:'#fef3c7', fg:'#92400e' },
    { bg:'#ede9fe', fg:'#6d28d9' },
  ]
  return palette[index % palette.length]
}

const toastPalette = {
  success: { bg:'#ecfdf5', fg:'#166534', border:'#bbf7d0' },
  error: { bg:'#fff1f2', fg:'#991b1b', border:'#fecaca' },
  info: { bg:'#eff6ff', fg:'#1d4ed8', border:'#bfdbfe' },
}

export default function RequestListPage() {
  const [definitions, setDefinitions] = useState<DefinitionItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [rows, setRows] = useState<RequestRow[]>([])
  const [listQuery, setListQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [expandedTypeRows, setExpandedTypeRows] = useState<Record<number, boolean>>({})
  const [detail, setDetail] = useState<DetailPayload | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'payload' | 'tests' | 'evaluation'>('payload')
  const [createForm, setCreateForm] = useState({ customerQuery:'', customer_id:'', customer_branch_id:'', customer_contact_id:'', requested_inspection_date:'', inspection_type_ids:[] as number[] })
  const [actionState, setActionState] = useState({ revision_reason:'', reject_reason:'' })
  const [payloadEditor, setPayloadEditor] = useState<Record<string, string>>({})
  const [requestedTestIds, setRequestedTestIds] = useState<number[]>([])
  const [evaluationDrafts, setEvaluationDrafts] = useState<Record<number, { suitability_status:string; unsuitable_reason:string; evaluation_note:string }>>({})
  const [lineAddId, setLineAddId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerForm, setCustomerForm] = useState<CustomerCreateForm>(emptyCustomerForm())
  const [showRevisionHistory, setShowRevisionHistory] = useState(false)
  const [toast, setToast] = useState<ToastState>({ open:false, text:'', kind:'info' })
  const toastTimerRef = useRef<number | null>(null)

  const notify = (text:string, kind:ToastState['kind']='info') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ open:true, text, kind })
    toastTimerRef.current = window.setTimeout(() => setToast(prev => ({ ...prev, open:false })), 3200)
  }

  const filteredCustomers = useMemo(() => {
    const q = createForm.customerQuery.trim().toLocaleLowerCase('tr-TR')
    if (!q) return customers
    return customers.filter(item => {
      const branchText = item.branches.map(b => `${b.branch_name} ${b.address || ''}`).join(' ')
      const contactText = item.contacts.map(c => `${c.full_name} ${c.phone || ''} ${c.email || ''} ${c.title || ''}`).join(' ')
      const haystack = `${item.customer_name} ${item.trade_name} ${item.tax_office || ''} ${item.tax_number || ''} ${branchText} ${contactText}`.toLocaleLowerCase('tr-TR')
      return haystack.includes(q)
    })
  }, [customers, createForm.customerQuery])
  const selectedCustomer = useMemo(() => customers.find(item => String(item.id) === createForm.customer_id) || null, [customers, createForm.customer_id])
  const selectedBranch = useMemo(() => selectedCustomer?.branches.find(item => String(item.id) === createForm.customer_branch_id) || null, [selectedCustomer, createForm.customer_branch_id])
  const availableContacts = useMemo(() => {
    if (!selectedCustomer) return []
    if (!createForm.customer_branch_id) return selectedCustomer.contacts
    return selectedCustomer.contacts.filter(item => !item.branch_id || String(item.branch_id) === createForm.customer_branch_id)
  }, [selectedCustomer, createForm.customer_branch_id])
  const selectedContact = useMemo(() => availableContacts.find(item => String(item.id) === createForm.customer_contact_id) || null, [availableContacts, createForm.customer_contact_id])

  const selectedLine = useMemo(() => detail?.lines.find(item => item.id === selectedLineId) || null, [detail, selectedLineId])
  const selectedEvaluations = useMemo(() => (detail?.evaluations || []).filter(row => row.request_inspection_line_id === selectedLineId), [detail, selectedLineId])
  const canEditLines = Boolean(detail && ((!detail.request.is_current) || detail.request.revision_status === 'DRAFT'))
  const addableDefinitions = definitions.filter(def => !detail?.lines.some(line => line.inspection_definition_id === def.id))

  const modalBranchOptions = useMemo(() => customerForm.branches.map(item => ({ key:item.client_key, label:item.branch_name || 'Adsız Şube' })), [customerForm.branches])
  const canStartRevision = Boolean(detail?.request.is_current && detail?.request.request_status === 'APPROVED' && detail?.request.revision_status === 'APPROVED')
  const isRevisionDraft = Boolean(detail && !detail.request.is_current && detail.request.revision_status === 'DRAFT')
  const isRevisionPending = Boolean(detail && !detail.request.is_current && detail.request.revision_status === 'PENDING_APPROVAL')

  function applyCustomerSelection(customer:any) {
    const defaultBranch = customer?.branches?.find((item:any) => item.is_default) || customer?.branches?.[0] || null
    const filtered = (customer?.contacts || []).filter((item:any) => !defaultBranch || !item.branch_id || item.branch_id === defaultBranch.id)
    const defaultContact = filtered.find((item:any) => item.is_default) || filtered[0] || customer?.contacts?.find((item:any) => item.is_default) || customer?.contacts?.[0] || null
    setCreateForm(prev => ({
      ...prev,
      customer_id: customer ? String(customer.id) : '',
      customer_branch_id: defaultBranch ? String(defaultBranch.id) : '',
      customer_contact_id: defaultContact ? String(defaultContact.id) : '',
    }))
  }

  async function loadDefinitions() {
    try {
      const res = await apiClient.get('/inspection/request-definitions')
      setDefinitions(res.data.items || [])
    } catch {
      setDefinitions([])
    }
  }

  async function loadCustomers(query = createForm.customerQuery) {
    const res = await apiClient.get('/customers', { params: query.trim() ? { q: query } : {} })
    setCustomers(res.data.items || [])
  }

  async function loadRequests(preferredId?:number) {
    setLoading(true)
    try {
      const res = await apiClient.get('/requests')
      const items = res.data.items || []
      setRows(items)
      if (!items.length) {
        setSelectedId(null)
        setDetail(null)
        return
      }
      const nextId = preferredId && items.some((item:RequestRow) => item.id === preferredId) ? preferredId : (selectedId && items.some((item:RequestRow) => item.id === selectedId) ? selectedId : items[0].id)
      if (nextId) {
        setSelectedId(nextId)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadDetail(requestId:number, preserveLineId:number | null = null, preserveTab:'payload' | 'tests' | 'evaluation' | null = null) {
    setSelectedId(requestId)
    const res = await apiClient.get(`/requests/${requestId}`)
    const payload = res.data as DetailPayload
    setDetail(payload)
    const nextLineId = preserveLineId && payload.lines.some(item => item.id === preserveLineId) ? preserveLineId : null
    setSelectedLineId(nextLineId)
    const baseLine = nextLineId ? payload.lines.find(item => item.id === nextLineId) : payload.lines[0]
    if (preserveTab) setActiveTab(preserveTab)
    setPayloadEditor(baseLine?.payload || {})
    setRequestedTestIds((baseLine?.tests || []).filter(item => item.is_requested).map(item => item.id))
    const drafts: Record<number, { suitability_status:string; unsuitable_reason:string; evaluation_note:string }> = {}
    ;(payload.evaluations || []).forEach(row => {
      drafts[row.id] = {
        suitability_status: row.suitability_status || 'SUITABLE',
        unsuitable_reason: row.unsuitable_reason || '',
        evaluation_note: row.evaluation_note || '',
      }
    })
    setEvaluationDrafts(drafts)
    setActionState({ revision_reason: payload.request.revision_reason || '', reject_reason:'' })
  }

  async function preserveScroll(action: () => Promise<void>) {
    const top = window.scrollY
    const left = window.scrollX
    await action()
    window.requestAnimationFrame(() => window.scrollTo({ top, left }))
  }

  useEffect(() => {
    loadDefinitions().catch(() => undefined)
    loadCustomers('').catch(() => undefined)
    loadRequests().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!selectedId && rows[0]?.id) {
      loadDetail(rows[0].id).catch(() => undefined)
    }
  }, [rows, selectedId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCustomers(createForm.customerQuery).catch(() => undefined)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [createForm.customerQuery])

  useEffect(() => {
    const q = createForm.customerQuery.trim().toLocaleLowerCase('tr-TR')
    if (!q) return
    const matches = customers.filter(item => {
      const branchText = item.branches.map(b => `${b.branch_name} ${b.address || ''}`).join(' ')
      const contactText = item.contacts.map(c => `${c.full_name} ${c.phone || ''} ${c.email || ''} ${c.title || ''}`).join(' ')
      const haystack = `${item.customer_name} ${item.trade_name} ${item.tax_office || ''} ${item.tax_number || ''} ${branchText} ${contactText}`.toLocaleLowerCase('tr-TR')
      return haystack.includes(q)
    })
    if (!matches.length) return

    const startsWith = matches.find(item => String(item.customer_name || '').trim().toLocaleLowerCase('tr-TR').startsWith(q))
    const exact = matches.find(item =>
      [item.customer_name, item.trade_name, item.tax_number || '', item.tax_office || '']
        .map(v => String(v).trim().toLocaleLowerCase('tr-TR'))
        .includes(q)
    )
    const candidate = exact || startsWith || matches[0] || null
    if (!candidate) return
    applyCustomerSelection(candidate)
  }, [customers, createForm.customerQuery])

  useEffect(() => {
    if (!selectedCustomer) return
    const defaultBranch = selectedCustomer.branches.find(item => item.is_default) || selectedCustomer.branches[0] || null
    if (!createForm.customer_branch_id && defaultBranch) {
      setCreateForm(prev => ({ ...prev, customer_branch_id: String(defaultBranch.id) }))
    }
  }, [selectedCustomer, createForm.customer_branch_id])

  useEffect(() => {
    if (!availableContacts.length) return
    if (!createForm.customer_contact_id || !availableContacts.some(item => String(item.id) == createForm.customer_contact_id)) {
      const defaultContact = availableContacts.find(item => item.is_default) || availableContacts[0]
      if (defaultContact) {
        setCreateForm(prev => ({ ...prev, customer_contact_id: String(defaultContact.id) }))
      }
    }
  }, [availableContacts, createForm.customer_contact_id])

  useEffect(() => {
    if (selectedLine) {
      setPayloadEditor(selectedLine.payload || {})
      setRequestedTestIds((selectedLine.tests || []).filter(item => item.is_requested).map(item => item.id))
    }
  }, [selectedLineId, selectedLine])

  async function handleSeed() {
    try {
      await apiClient.post('/inspection/seed-request-definitions')
      await loadDefinitions()
      notify('Muayene tanımları yüklendi', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'Tanımlar yüklenemedi', 'error')
    }
  }

  function handleEditFromList(requestId:number) {
    loadDetail(requestId).then(() => {
      window.requestAnimationFrame(() => {
        const el = document.getElementById('selected-request-panel')
        if (el) el.scrollIntoView({ block:'start', behavior:'smooth' })
      })
    }).catch(() => undefined)
  }

  async function handlePassiveRequest(requestId:number) {
    const ok = window.confirm('Bu talep pasife alınsın mı?')
    if (!ok) return
    setSaving(true)
    try {
      await apiClient.delete(`/requests/${requestId}`)
      if (selectedId === requestId) {
        setDetail(null)
        setSelectedId(null)
      }
      await loadRequests()
      notify('Talep pasife alındı', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'Talep pasife alınamadı', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate() {
    if (!createForm.customer_id) {
      notify('Önce müşteri seç', 'error')
      return
    }
    if (!createForm.inspection_type_ids.length) {
      notify('En az bir muayene türü seç', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await apiClient.post('/requests', {
        customer_id: Number(createForm.customer_id),
        customer_branch_id: createForm.customer_branch_id ? Number(createForm.customer_branch_id) : null,
        customer_contact_id: createForm.customer_contact_id ? Number(createForm.customer_contact_id) : null,
        requested_inspection_date: null,
        inspection_type_ids: createForm.inspection_type_ids,
      })
      const requestId = res.data?.request?.id || res.data?.id
      setCreateForm({ customerQuery:'', customer_id:'', customer_branch_id:'', customer_contact_id:'', requested_inspection_date:'', inspection_type_ids:[] })
      await loadRequests(requestId)
      if (requestId) await loadDetail(requestId)
      notify('Talep oluşturuldu', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'Talep oluşturulamadı', 'error')
    } finally {
      setSaving(false)
    }
  }

  function updateModalBranch(clientKey:string, patch: Partial<FormBranch>) {
    setCustomerForm(prev => ({
      ...prev,
      branches: prev.branches.map(item => {
        if (patch.is_default) return { ...item, is_default: item.client_key === clientKey }
        return item.client_key === clientKey ? { ...item, ...patch } : item
      }),
    }))
  }

  function updateModalContact(clientKey:string, patch: Partial<FormContact>) {
    setCustomerForm(prev => ({
      ...prev,
      contacts: prev.contacts.map(item => {
        if (patch.is_default) return { ...item, is_default: item.client_key === clientKey }
        return item.client_key === clientKey ? { ...item, ...patch } : item
      }),
    }))
  }

  function addModalBranch() {
    setCustomerForm(prev => ({ ...prev, branches: [...prev.branches, emptyBranch(false)] }))
  }

  function removeModalBranch(clientKey:string) {
    setCustomerForm(prev => {
      if (prev.branches.length === 1) return prev
      const remainingBranches = prev.branches.filter(item => item.client_key !== clientKey)
      const replacement = remainingBranches.find(item => item.is_default) || remainingBranches[0]
      return {
        ...prev,
        branches: remainingBranches.map((item, index) => ({ ...item, is_default: replacement ? item.client_key === replacement.client_key : index === 0 })),
        contacts: prev.contacts.map(contact => contact.branch_key === clientKey ? { ...contact, branch_key: replacement.client_key } : contact),
      }
    })
  }

  function addModalContact() {
    const defaultBranchKey = customerForm.branches.find(item => item.is_default)?.client_key || customerForm.branches[0]?.client_key || ''
    setCustomerForm(prev => ({ ...prev, contacts: [...prev.contacts, emptyContact(defaultBranchKey, false)] }))
  }

  function removeModalContact(clientKey:string) {
    setCustomerForm(prev => {
      if (prev.contacts.length === 1) return prev
      const remainingContacts = prev.contacts.filter(item => item.client_key !== clientKey)
      const replacement = remainingContacts.find(item => item.is_default) || remainingContacts[0]
      return {
        ...prev,
        contacts: remainingContacts.map((item, index) => ({ ...item, is_default: replacement ? item.client_key === replacement.client_key : index === 0 })),
      }
    })
  }

  async function handleCreateCustomer() {
    setSaving(true)
    try {
      const res = await apiClient.post('/customers', {
        customer_name: customerForm.customer_name.trim(),
        trade_name: customerForm.trade_name.trim(),
        tax_office: customerForm.tax_office.trim(),
        tax_number: customerForm.tax_number.trim(),
        branches: customerForm.branches.map(item => ({
          client_key: item.client_key,
          branch_name: item.branch_name.trim(),
          address: item.address.trim(),
          is_default: item.is_default,
        })),
        contacts: customerForm.contacts.map(item => ({
          client_key: item.client_key,
          branch_key: item.branch_key,
          full_name: item.full_name.trim(),
          phone: item.phone.trim(),
          email: item.email.trim(),
          title: item.title.trim(),
          is_default: item.is_default,
        })),
      })
      await loadCustomers(customerForm.customer_name)
      const createdId = res.data?.id
      if (createdId) {
        const createdCustomer = res.data as Customer
        const defaultBranch = createdCustomer.branches.find(item => item.is_default) || createdCustomer.branches[0]
        const defaultContact = createdCustomer.contacts.find(item => item.is_default) || createdCustomer.contacts[0]
        setCreateForm(prev => ({
          ...prev,
          customerQuery: customerForm.customer_name.trim(),
          customer_id: String(createdId),
          customer_branch_id: defaultBranch ? String(defaultBranch.id) : '',
          customer_contact_id: defaultContact ? String(defaultContact.id) : '',
        }))
      }
      setCustomerForm(emptyCustomerForm())
      setShowCustomerModal(false)
      notify('Müşteri eklendi', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'Müşteri eklenemedi', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleRevisionStart() {
    if (!selectedId) return
    if (!actionState.revision_reason.trim()) {
      notify('Revizyon nedeni zorunlu', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await apiClient.post(`/requests/${selectedId}/revision/start`, { revision_reason: actionState.revision_reason.trim() })
      const id = res.data?.request?.id || res.data?.id || selectedId
      await loadRequests(id)
      await loadDetail(id)
      notify('Revizyon taslağı oluşturuldu', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'Revizyon başlatılamadı', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTransition(kind:'submit' | 'approve' | 'reject' | 'revision-submit' | 'revision-approve' | 'revision-reject') {
    if (!selectedId) return
    setSaving(true)
    try {
      if (kind === 'submit') await apiClient.post(`/requests/${selectedId}/submit`)
      if (kind === 'approve') await apiClient.post(`/requests/${selectedId}/approve`)
      if (kind === 'reject') await apiClient.post(`/requests/${selectedId}/reject`, { reason: actionState.reject_reason || null })
      if (kind === 'revision-submit') await apiClient.post(`/requests/${selectedId}/revision/submit`)
      if (kind === 'revision-approve') await apiClient.post(`/requests/${selectedId}/revision/approve`)
      if (kind === 'revision-reject') await apiClient.post(`/requests/${selectedId}/revision/reject`, { reason: actionState.reject_reason || null })
      await loadRequests(selectedId)
      await loadDetail(selectedId)
      notify('Durum güncellendi', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'İşlem tamamlanamadı', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePayload() {
    if (!selectedLineId || !selectedId) return
    setSaving(true)
    try {
      await preserveScroll(async () => {
        await apiClient.put(`/requests/lines/${selectedLineId}/payload`, { payload: payloadEditor })
        await loadDetail(selectedId, selectedLineId, 'payload')
      })
      notify('Detay alanları kaydedildi', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'Detay alanları kaydedilemedi', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveTests() {
    if (!selectedLineId || !selectedId) return
    setSaving(true)
    try {
      await preserveScroll(async () => {
        await apiClient.put(`/requests/lines/${selectedLineId}/tests`, { requested_test_ids: requestedTestIds })
        await loadDetail(selectedId, selectedLineId, 'tests')
      })
      notify('Test seçimleri kaydedildi', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'Test seçimimleri kaydedilemedi', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEvaluation(id:number) {
    if (!selectedId) return
    setSaving(true)
    try {
      await preserveScroll(async () => {
        await apiClient.put(`/requests/evaluations/${id}`, evaluationDrafts[id])
        await loadDetail(selectedId, selectedLineId, 'evaluation')
      })
      notify('Değerlendirme kaydedildi', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'Değerlendirme kaydedilemedi', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAllEvaluations() {
    if (!selectedId || !selectedLineId) return
    setSaving(true)
    try {
      const items = selectedEvaluations.map(row => ({ id: row.id, ...evaluationDrafts[row.id] }))
      await preserveScroll(async () => {
        await apiClient.put(`/requests/${selectedId}/lines/${selectedLineId}/evaluations`, { items })
        await loadDetail(selectedId, selectedLineId, 'evaluation')
      })
      notify('Tüm test değerlendirmeleri kaydedildi', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'Toplu değerlendirme kaydedilemedi', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filteredListRows = useMemo(() => {
    const q = listQuery.trim().toLocaleLowerCase('tr-TR')
    if (!q) return rows
    return rows.filter((row) => [row.request_no, row.customer_name, ...(row.inspection_types || [])].some((value) => String(value || '').toLocaleLowerCase('tr-TR').includes(q)))
  }, [rows, listQuery])

  async function handleAddLine() {
    if (!selectedId || !lineAddId) return
    setSaving(true)
    try {
      await apiClient.post(`/requests/${selectedId}/lines`, { inspection_type_id: Number(lineAddId) })
      await loadDetail(selectedId)
      await loadRequests(selectedId)
      setLineAddId('')
      notify('Muayene türü eklendi', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'Muayene türü eklenemedi', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveLine() {
    if (!selectedLineId || !selectedId) return
    setSaving(true)
    try {
      await apiClient.delete(`/requests/lines/${selectedLineId}`)
      await loadDetail(selectedId)
      await loadRequests(selectedId)
      notify('Muayene türü kaldırıldı', 'success')
    } catch (err:any) {
      notify(err?.response?.data?.detail || 'Muayene türü kaldırılamadı', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display:'grid', gap:18 }}>
      <AppToast open={toast.open} text={toast.text} kind={toast.kind} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ margin:0, fontSize:30, color:'#111827' }}>Talep Yönetimi</h1>
          <div style={{ color:'#64748b', marginTop:6 }}>Customer + Request modülü için stabil talep oluşturma, revizyon ve değerlendirme akışı.</div>
        </div>
        <button type="button" style={btnPrimary} onClick={handleSeed}>Tanımları Yükle</button>
      </div>

      <div style={{ ...card, display:'grid', gap:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div>
            <h2 style={{ margin:0, fontSize:26 }}>Yeni Talep Oluştur</h2>
            <div style={{ color:'#64748b', marginTop:8 }}>Müşteri yazıldıkça arama otomatik filtrelenir. Gerekirse aynı ekrandan yeni müşteri açabilirsin.</div>
          </div>
          <button type="button" style={btnLight} onClick={() => setShowCustomerModal(true)}>Yeni Müşteri Ekle</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr 1fr', gap:14 }}>
          <label style={labelStyle}>Müşteri Ara
            <input style={input} placeholder="Müşteri, şube, yetkili veya vergi no" value={createForm.customerQuery} onChange={(e)=>setCreateForm(prev => ({ ...prev, customerQuery:e.target.value }))} />
          </label>
          <label style={labelStyle}>Müşteri
            <select style={input} value={createForm.customer_id} onChange={(e)=> { const found = filteredCustomers.find(item => String(item.id) === e.target.value); if (found) { applyCustomerSelection(found) } else { setCreateForm(prev => ({ ...prev, customer_id:'', customer_branch_id:'', customer_contact_id:'' })) } }}>
              <option value="">Seç</option>
              {filteredCustomers.map(item => <option key={item.id} value={item.id}>{item.customer_name} — {item.trade_name}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Şube / Lokasyon
            <select style={input} value={createForm.customer_branch_id} onChange={(e)=>setCreateForm(prev => ({ ...prev, customer_branch_id:e.target.value, customer_contact_id:'' }))} disabled={!selectedCustomer}>
              <option value="">Seç</option>
              {(selectedCustomer?.branches || []).map(item => <option key={item.id} value={item.id}>{item.branch_name}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Yetkili Kişi
            <select style={input} value={createForm.customer_contact_id} onChange={(e)=>setCreateForm(prev => ({ ...prev, customer_contact_id:e.target.value }))} disabled={!selectedCustomer}>
              <option value="">Seç</option>
              {availableContacts.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:14 }}>
          <label style={labelStyle}>Adres<input style={readonlyInput} readOnly value={selectedBranch?.address || ''} /></label>
          <label style={labelStyle}>Telefon<input style={readonlyInput} readOnly value={selectedContact?.phone || ''} /></label>
          <label style={labelStyle}>E-Posta<input style={readonlyInput} readOnly value={selectedContact?.email || ''} /></label>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20, alignItems:'stretch' }}>
          <div style={{ ...softCard, display:'grid', gap:14, alignContent:'start' }}>
            <div style={{ color:'#64748b', lineHeight:1.5 }}>Talep tarihi sistem tarafından otomatik oluşturulur.</div>
            <button type="button" style={{ ...btnDark, width:'100%' }} onClick={handleCreate} disabled={saving || loading}>{saving ? 'Oluşturuluyor...' : 'Yeni Talebi Oluştur'}</button>
          </div>

          <div style={{ ...softCard, display:'grid', gap:12 }}>
            <div style={{ fontSize:18, fontWeight:800, color:'#111827' }}>Muayene Türleri</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:10 }}>
              {definitions.map(item => {
                const checked = createForm.inspection_type_ids.includes(item.id)
                return (
                  <label key={item.id} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 12px', border:`1px solid ${checked ? '#dc2626' : '#e5e7eb'}`, borderRadius:14, background:checked ? '#fff7ed' : '#fff', cursor:'pointer' }}>
                    <input type="checkbox" checked={checked} onChange={(e)=>setCreateForm(prev => ({ ...prev, inspection_type_ids: e.target.checked ? [...prev.inspection_type_ids, item.id] : prev.inspection_type_ids.filter(x => x !== item.id) }))} style={{ marginTop:2 }} />
                    <span style={{ lineHeight:1.4 }}>{item.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...card, display:'grid', gap:14, minWidth:0, overflow:'hidden' }}>
        <ListPageHeader
          title="Talep Listesi"
          total={rows.length}
          search={listQuery}
          searchPlaceholder="Talep no, müşteri veya muayene türü ara"
          onSearchChange={setListQuery}
          onClear={() => setListQuery('')}
        />
        <div style={standardTableWrap}>
          <table style={{ ...standardTableStyle, minWidth: 1160 }}>
            <thead>
              <tr style={darkHeaderRowStyle}>
                {['No', 'Talep No', 'Müşteri', 'Talep Tarihi', 'Muayene Türleri', 'Talep Durumu', 'Değerlendirme', 'Revizyon', 'Güncel', 'İşlem'].map((h, index, arr) => <th key={h} style={thStyle(index, arr.length)}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredListRows.map((row, index) => (
                <tr key={row.id} onClick={() => loadDetail(row.id)} style={{ cursor:'pointer', background: row.id === selectedId ? '#fff7ed' : index % 2 ? '#fff' : '#fcfcfd' }}>
                  <td style={{ ...cellStyle, whiteSpace:'nowrap', width:48 }}>{index + 1}</td>
                  <td style={{ ...cellStyle, fontWeight:800, width:128, whiteSpace:'nowrap' }}>{row.request_no}</td>
                  <td style={{ ...cellStyle, width:260 }}><span style={ellipsisTextStyle}>{row.customer_name}</span></td>
                  <td style={{ ...cellStyle, whiteSpace:'nowrap', width:106 }}>{formatDate((row as any).created_at)}</td>
                  <td style={{ ...cellStyle, width:176 }}>
                    {(() => {
                      const parts = inspectionTypeBadges(row.inspection_types)
                      const expanded = !!expandedTypeRows[row.id]
                      const shown = expanded ? row.inspection_types : parts.visible
                      return (
                        <div style={{ display:'grid', gap:6 }}>
                          {shown.map((name, index) => {
                            const color = inspectionTypeColor(index)
                            return <span key={name + index} style={{ display:'inline-flex', width:'fit-content', padding:'4px 10px', borderRadius:999, background:color.bg, color:color.fg, fontSize:12, fontWeight:700 }}>{name}</span>
                          })}
                          {parts.hidden.length ? (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedTypeRows(prev => ({ ...prev, [row.id]: !expanded })) }} style={{ ...btnLight, padding:'4px 10px', fontSize:12, width:'fit-content' }}>
                              {expanded ? 'Daha Az' : `+${parts.hidden.length}`}
                            </button>
                          ) : null}
                        </div>
                      )
                    })()}
                  </td>
                  <td style={{ ...cellStyle, width:108 }}>{mapStatus(row.request_status)}</td>
                  <td style={{ ...cellStyle, width:108 }}>{mapStatus(row.evaluation_status)}</td>
                  <td style={{ ...cellStyle, width:108 }}>
                    {mapStatus(row.revision_status)}
                  </td>
                  <td style={{ ...cellStyle, width:96 }}>{row.is_current ? 'Güncel' : 'Taslak/Geçmiş'}</td>
                  <td style={{ ...cellStyle, width:150 }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      <button type="button" style={{ ...btnLight, padding:'8px 12px', fontSize:13 }} onClick={() => handleEditFromList(row.id)}>Düzenle</button>
                      <button type="button" style={{ ...btnDark, padding:'8px 12px', fontSize:13 }} onClick={() => handlePassiveRequest(row.id)}>Pasife Al</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredListRows.length ? <tr><td colSpan={10} style={{ ...cellStyle, padding:18, textAlign:'center', color:'#64748b' }}>Henüz talep yok</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      {detail ? (
        <div id="selected-request-panel" style={{ ...card, display:'grid', gap:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,0.78fr) minmax(0,1.22fr)', gap:16, alignItems:'start' }}>
            <div style={{ display:'grid', gap:10 }}>
              <div style={{ fontSize:12, color:'#6b7280', fontWeight:700 }}>SEÇİLİ TALEP</div>
              <div style={{ fontSize:34, fontWeight:800, color:'#0f172a' }}>{detail.request.request_no}</div>
              <div style={{ color:'#475569', fontSize:18 }}>{detail.customer_ref?.customer_name || detail.request.customer_name}</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {mapStatus(detail.request.request_status)}
                {mapStatus(detail.request.evaluation_status)}
              </div>
              {detail.offer_bridge?.current_offer?.offer_no ? <div style={helperText}>Bağlı teklif: <strong>{detail.offer_bridge.current_offer.offer_no}</strong></div> : <div style={helperText}>{detail.offer_bridge?.message || 'Teklif bağlantısı henüz yok.'}</div>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:12 }}>
              <div style={{ ...softCard, padding:14 }}><div style={helperText}>Yetkili</div><div style={{ fontWeight:700, marginTop:6 }}>{detail.customer_ref?.contact_name || detail.request.contact_person_name || '-'}</div></div>
              <div style={{ ...softCard, padding:14 }}><div style={helperText}>Talep Tarihi</div><div style={{ fontWeight:700, marginTop:6 }}>{formatDate((detail.request as any).created_at || detail.request.requested_inspection_date)}</div></div>
              <div style={{ ...softCard, padding:14 }}><div style={helperText}>Telefon</div><div style={{ fontWeight:700, marginTop:6 }}>{detail.customer_ref?.phone || detail.request.phone || '-'}</div></div>
              <div style={{ ...softCard, padding:14 }}><div style={helperText}>E-Posta</div><div style={{ fontWeight:700, marginTop:6, wordBreak:'break-word', overflowWrap:'anywhere' }}>{detail.customer_ref?.email || detail.request.email || '-'}</div></div>
              <div style={{ ...softCard, padding:14, gridColumn:'1 / span 2' }}><div style={helperText}>Adres</div><div style={{ fontWeight:700, marginTop:6 }}>{detail.customer_ref?.address || detail.request.inspection_location_address || '-'}</div></div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,0.78fr) minmax(0,1.22fr)', gap:16, alignItems:'start' }}>
            <div style={{ ...softCard, display:'grid', gap:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:800 }}>Revizyon Akışı</div>
                  <div style={helperText}>Eski revizyonlardan yeni revizyon başlatılamaz. Yalnızca son onaylı revizyon üzerinden işlem yapılır.</div>
                </div>
                {detail.revisions && detail.revisions.length > 1 ? <button type="button" style={btnLight} onClick={() => setShowRevisionHistory(prev => !prev)}>{showRevisionHistory ? 'Geçmişi Gizle' : 'Revizyon Geçmişi'}</button> : null}
              </div>

              <label style={labelStyle}>Revizyon Nedeni
                <textarea style={{ ...textarea, minHeight:92 }} value={actionState.revision_reason} onChange={(e)=>setActionState(prev => ({ ...prev, revision_reason:e.target.value }))} placeholder={canStartRevision ? 'Revizyon nedeni yazın' : 'Mevcut revizyon nedeni'} readOnly={!canStartRevision} />
              </label>

              {canStartRevision ? <button type="button" style={{ ...btnDark, width:'fit-content' }} onClick={handleRevisionStart}>Revizyon Başlat</button> : null}
              {!canStartRevision ? <div style={helperText}>{detail.request.is_current ? 'Yeni revizyon başlatmak için talebin güncel ve onaylı olması gerekir.' : 'Bu kayıt geçmiş/taslak revizyon olduğu için buradan yeniden revizyon başlatılamaz.'}</div> : null}

              {showRevisionHistory && detail.revisions?.length ? (
                <div style={{ display:'grid', gap:10 }}>
                  {detail.revisions.map(item => (
                    <div key={item.id} style={{ border:'1px solid #e5e7eb', borderRadius:14, padding:12, background:item.id === detail.request.id ? '#fff7ed' : '#fff', display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                      <div>
                        <div style={{ fontWeight:800 }}>{item.request_no}</div>
                        <div style={{ color:'#64748b', marginTop:4 }}>{formatDate(item.created_at)}</div>
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        {mapStatus(item.request_status)}
                        {item.id === detail.request.id ? <span style={badgeStyle('ok')}>Açık</span> : <button type="button" style={btnLight} onClick={() => loadDetail(item.id)}>Aç</button>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={{ ...softCard, display:'grid', gap:12 }}>
              <div style={{ fontSize:18, fontWeight:800 }}>Karar İşlemleri</div>
              <label style={labelStyle}>Red Gerekçesi
                <input style={input} value={actionState.reject_reason} onChange={(e)=>setActionState(prev => ({ ...prev, reject_reason:e.target.value }))} placeholder="Opsiyonel red veya revizyon reddi gerekçesi" />
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:12 }}>
                {detail.request.is_current ? (
                  <>
                    <button type="button" style={{ ...btnLight, width:'100%', minHeight:56 }} onClick={() => handleTransition('submit')}>İncelemeye Gönder</button>
                    <button type="button" style={{ ...btnPrimary, width:'100%', minHeight:56 }} onClick={() => handleTransition('approve')}>Onayla</button>
                    <button type="button" style={{ ...btnDark, width:'100%', minHeight:56 }} onClick={() => handleTransition('reject')}>Reddet</button>
                  </>
                ) : null}
                {isRevisionDraft ? <button type="button" style={{ ...btnLight, width:'100%', minHeight:56 }} onClick={() => handleTransition('revision-submit')}>Revizyonu Gönder</button> : null}
                {isRevisionPending ? <button type="button" style={{ ...btnPrimary, width:'100%', minHeight:56 }} onClick={() => handleTransition('revision-approve')}>Revizyonu Onayla</button> : null}
                {(isRevisionDraft || isRevisionPending) ? <button type="button" style={{ ...btnDark, width:'100%', minHeight:56 }} onClick={() => handleTransition('revision-reject')}>Revizyonu Reddet</button> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div style={{ ...card, display:'grid', gap:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <h2 style={{ margin:0 }}>Muayene Türleri</h2>
            {canEditLines ? (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <select style={{ ...input, minWidth:220 }} value={lineAddId} onChange={(e)=>setLineAddId(e.target.value)}>
                  <option value="">Muayene türü ekle</option>
                  {addableDefinitions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <button type="button" style={btnDark} onClick={handleAddLine}>Ekle</button>
              </div>
            ) : null}
          </div>

          <div style={{ display:'grid', gap:14 }}>
            {detail.lines.map(line => {
              const isSelected = line.id === selectedLineId
              const lineEvaluations = (detail.evaluations || []).filter(row => row.request_inspection_line_id === line.id)
              return (
                <div key={line.id} style={{ border:`1px solid ${isSelected ? '#dc2626' : '#e5e7eb'}`, borderRadius:18, background:isSelected ? '#fff7ed' : '#fff', overflow:'hidden' }}>
                  <div onClick={() => setSelectedLineId(prev => prev === line.id ? null : line.id)} style={{ padding:16, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:22, color:'#111827' }}>{line.inspection_type_name_snapshot}</div>
                      <div style={{ color:'#64748b', marginTop:8 }}>{`${line.tests.length} test • ${Object.keys(line.payload || {}).length} alan`}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <button type='button' style={isSelected ? btnPrimary : btnLight} onClick={(e) => { e.stopPropagation(); setSelectedLineId(prev => prev === line.id ? null : line.id) }}>
{isSelected ? 'Kapat' : 'Aç'}
                      </button>
                      {canEditLines && isSelected ? <button type='button' style={btnLight} onClick={(e) => { e.stopPropagation(); handleRemoveLine() }}>Kaldır</button> : null}
                    </div>
                  </div>

                  {isSelected ? (
                    <div style={{ borderTop:'1px solid #e5e7eb', padding:16, display:'grid', gap:14, background:'#fff' }}>
                      <div style={{ fontSize:12, color:'#6b7280', fontWeight:700 }}>SEÇİLİ SATIR</div>
                      <div style={{ fontSize:28, fontWeight:800 }}>{line.inspection_type_name_snapshot}</div>

                      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                        <button type='button' style={activeTab === 'payload' ? btnPrimary : btnLight} onClick={() => { setSelectedLineId(line.id); setActiveTab('payload') }}>Detay Alanları</button>
                        <button type='button' style={activeTab === 'tests' ? btnPrimary : btnLight} onClick={() => { setSelectedLineId(line.id); setActiveTab('tests') }}>Testler</button>
                        <button type='button' style={activeTab === 'evaluation' ? btnPrimary : btnLight} onClick={() => { setSelectedLineId(line.id); setActiveTab('evaluation') }}>Değerlendirme</button>
                      </div>

                      {activeTab === 'payload' ? (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12 }}>
                          {Object.entries(payloadEditor || {}).map(([key, value]) => <label key={key} style={labelStyle}>{key.split('_').join(' ')}<textarea style={textarea} value={value || ''} onChange={(e)=>setPayloadEditor({ ...payloadEditor, [key]: e.target.value })} /></label>)}
                          <div style={{ gridColumn:'1 / span 2', display:'flex', justifyContent:'flex-end' }}><button type='button' style={btnPrimary} onClick={handleSavePayload}>Detay Alanlarını Kaydet</button></div>
                        </div>
                      ) : null}

                      {activeTab === 'tests' ? (
                        <div style={{ display:'grid', gap:10 }}>
                          {line.tests.map(test => (
                            <label key={test.id} style={{ display:'flex', alignItems:'center', gap:10, padding:12, border:'1px solid #e5e7eb', borderRadius:12 }}>
                              <input type='checkbox' checked={requestedTestIds.includes(test.id)} onChange={(e)=>setRequestedTestIds(prev => e.target.checked ? [...prev, test.id] : prev.filter(x => x !== test.id))} />
                              <span>{test.test_name_snapshot}</span>
                            </label>
                          ))}
                          <div style={{ display:'flex', justifyContent:'flex-end' }}><button type='button' style={btnPrimary} onClick={handleSaveTests}>Testleri Kaydet</button></div>
                        </div>
                      ) : null}

                      {activeTab === 'evaluation' ? (
                        <div style={{ display:'grid', gap:12 }}>
                          <div style={{ display:'grid', gap:10 }}>
                            <div style={{ color:'#64748b' }}>Durum alanı daralmayacak şekilde yenilendi. Uygun Değil etiketi listede U.D. olarak gösterilir.</div>
                            <div><button type='button' style={{ ...btnDark, padding:'10px 14px', width:'fit-content' }} onClick={handleSaveAllEvaluations}>Tüm Testleri Kaydet</button></div>
                          </div>
                          <div style={{ display:'grid', gap:12 }}>
                            {lineEvaluations.map(row => (
                              <div key={row.id} style={{ border:'1px solid #e5e7eb', borderRadius:14, padding:12, display:'grid', gridTemplateColumns:'minmax(170px,1.1fr) 112px 150px 150px 84px', gap:8, alignItems:'end' }}>
                                <div>
                                  <div style={{ fontWeight:800, fontSize:16 }}>{row.test_name_snapshot || row.test_code}</div>
                                  <div style={{ color:'#64748b', marginTop:4 }}>Son değerlendirme: {row.evaluated_at ? formatDate(row.evaluated_at) : '-'}</div>
                                </div>
                                <label style={labelStyle}>Durum
                                  <select style={{ ...input, minHeight:48, fontSize:14, padding:'8px 10px' }} value={evaluationDrafts[row.id]?.suitability_status || 'SUITABLE'} onChange={(e)=>setEvaluationDrafts({ ...evaluationDrafts, [row.id]: { ...evaluationDrafts[row.id], suitability_status:e.target.value } })}>
                                    <option value='SUITABLE'>Uygun</option>
                                    <option value='NOT_SUITABLE'>U.D.</option>
                                  </select>
                                </label>
                                <label style={labelStyle}>Uygun Değil Gerekçesi
                                  <input style={{ ...input, minHeight:48, fontSize:14, padding:'8px 10px' }} value={evaluationDrafts[row.id]?.unsuitable_reason || ''} onChange={(e)=>setEvaluationDrafts({ ...evaluationDrafts, [row.id]: { ...evaluationDrafts[row.id], unsuitable_reason:e.target.value } })} />
                                </label>
                                <label style={labelStyle}>Not
                                  <textarea style={{ ...textarea, minHeight:52, height:52, fontSize:14, padding:'10px 12px' }} value={evaluationDrafts[row.id]?.evaluation_note || ''} onChange={(e)=>setEvaluationDrafts({ ...evaluationDrafts, [row.id]: { ...evaluationDrafts[row.id], evaluation_note:e.target.value } })} />
                                </label>
                                <button type='button' style={{ ...btnPrimary, padding:'10px 12px' }} onClick={() => handleSaveEvaluation(row.id)}>Kaydet</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {showCustomerModal ? (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', display:'grid', placeItems:'center', zIndex:9999, padding:16 }}>
          <div style={{ ...card, width:'min(1120px, calc(100vw - 32px))', maxHeight:'92vh', display:'grid', gridTemplateRows:'auto minmax(0,1fr) auto', gap:14, overflow:'hidden' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div>
                <h3 style={{ margin:0, fontSize:24 }}>Yeni Müşteri Ekle</h3>
                <div style={{ color:'#64748b', marginTop:6 }}>Talep ekranından çıkmadan şube ve birden fazla yetkili ekleyebilirsin.</div>
              </div>
              <button type="button" style={btnLight} onClick={() => setShowCustomerModal(false)}>Kapat</button>
            </div>

            <div style={{ overflowY:'auto', paddingRight:8, display:'grid', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:12 }}>
                <label style={labelStyle}>Müşteri Adı<input style={input} value={customerForm.customer_name} onChange={(e)=>setCustomerForm(prev => ({ ...prev, customer_name:e.target.value }))} /></label>
                <label style={labelStyle}>Ticari Unvan<input style={input} value={customerForm.trade_name} onChange={(e)=>setCustomerForm(prev => ({ ...prev, trade_name:e.target.value }))} /></label>
                <label style={labelStyle}>Vergi Dairesi<input style={input} value={customerForm.tax_office} onChange={(e)=>setCustomerForm(prev => ({ ...prev, tax_office:e.target.value }))} /></label>
                <label style={labelStyle}>Vergi No<input style={input} value={customerForm.tax_number} onChange={(e)=>setCustomerForm(prev => ({ ...prev, tax_number:e.target.value }))} /></label>
              </div>

              <div style={{ ...softCard, display:'grid', gap:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <div>
                    <div style={{ fontSize:18, fontWeight:800 }}>Şubeler</div>
                    <div style={helperText}>Adres kutuları artık tam görünür. Modal dikey kaydırmalı yapıdadır.</div>
                  </div>
                  <button type="button" style={btnLight} onClick={addModalBranch}>Şube Ekle</button>
                </div>
                <div style={{ display:'grid', gap:12 }}>
                  {customerForm.branches.map((branch, index) => (
                    <div key={branch.client_key} style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:14, background:'#fff', display:'grid', gap:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                        <div style={{ fontWeight:800 }}>Şube {index + 1}</div>
                        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                          <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="radio" checked={branch.is_default} onChange={() => updateModalBranch(branch.client_key, { is_default:true })} /> Varsayılan</label>
                          <button type="button" style={btnLight} onClick={() => removeModalBranch(branch.client_key)} disabled={customerForm.branches.length === 1}>Sil</button>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'240px minmax(0, 1fr)', gap:12, alignItems:'start' }}>
                        <label style={labelStyle}>Şube / Lokasyon<input style={{ ...input, height:44, minHeight:44, padding:'10px 12px' }} value={branch.branch_name} onChange={(e)=>updateModalBranch(branch.client_key, { branch_name:e.target.value })} /></label>
                        <label style={labelStyle}>Adres<textarea style={{ ...textarea, height:44, minHeight:44, resize:'none', padding:'10px 12px' }} value={branch.address} onChange={(e)=>updateModalBranch(branch.client_key, { address:e.target.value })} /></label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...softCard, display:'grid', gap:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <div>
                    <div style={{ fontSize:18, fontWeight:800 }}>Yetkililer</div>
                    <div style={helperText}>Bir müşteriye birden fazla yetkili eklenebilir.</div>
                  </div>
                  <button type="button" style={btnLight} onClick={addModalContact}>Yetkili Ekle</button>
                </div>
                <div style={{ display:'grid', gap:12 }}>
                  {customerForm.contacts.map((contact, index) => (
                    <div key={contact.client_key} style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:14, background:'#fff', display:'grid', gap:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                        <div style={{ fontWeight:800 }}>Yetkili {index + 1}</div>
                        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                          <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="radio" checked={contact.is_default} onChange={() => updateModalContact(contact.client_key, { is_default:true })} /> Varsayılan</label>
                          <button type="button" style={btnLight} onClick={() => removeModalContact(contact.client_key)} disabled={customerForm.contacts.length === 1}>Sil</button>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, minmax(0,1fr))', gap:12 }}>
                        <label style={labelStyle}>Ad Soyad<input style={input} value={contact.full_name} onChange={(e)=>updateModalContact(contact.client_key, { full_name:e.target.value })} /></label>
                        <label style={labelStyle}>Telefon<input style={input} value={contact.phone} onChange={(e)=>updateModalContact(contact.client_key, { phone:e.target.value })} /></label>
                        <label style={labelStyle}>E-Posta<input style={input} value={contact.email} onChange={(e)=>updateModalContact(contact.client_key, { email:e.target.value })} /></label>
                        <label style={labelStyle}>Görev<input style={input} value={contact.title} onChange={(e)=>updateModalContact(contact.client_key, { title:e.target.value })} /></label>
                        <label style={labelStyle}>Bağlı Şube<select style={input} value={contact.branch_key} onChange={(e)=>updateModalContact(contact.client_key, { branch_key:e.target.value })}>{modalBranchOptions.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, background:'#fff' }}>
              <button type="button" style={btnLight} onClick={() => setCustomerForm(emptyCustomerForm())}>Temizle</button>
              <button type="button" style={btnPrimary} onClick={handleCreateCustomer} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Müşteriyi Kaydet'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
