import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { apiClient } from '../../../api/client'

type Contact = { id:number; branch_id?:number|null; full_name:string; phone?:string|null; email?:string|null; title?:string|null; is_default:boolean }
type Branch = { id:number; branch_name:string; address?:string|null; is_default:boolean }
type Customer = { id:number; customer_name:string; trade_name:string; tax_office?:string|null; tax_number?:string|null; branches:Branch[]; contacts:Contact[] }

type FormBranch = { client_key:string; branch_name:string; address:string; is_default:boolean; source_id?:number }
type FormContact = { client_key:string; branch_key:string; full_name:string; phone:string; email:string; title:string; is_default:boolean; source_id?:number; source_branch_id?:number|null }

type CustomerForm = {
  customer_name:string
  trade_name:string
  tax_office:string
  tax_number:string
  branches:FormBranch[]
  contacts:FormContact[]
}

const pageWrap: CSSProperties = {
  width: '100%',
  maxWidth: 1460,
  margin: '0 auto',
}

const card: CSSProperties = {
  background:'#fff',
  borderRadius:18,
  border:'1px solid #e5e7eb',
  padding:20,
  boxShadow:'0 12px 32px rgba(15,23,42,0.06)',
}
const input: CSSProperties = {
  width:'100%',
  border:'1px solid #d1d5db',
  borderRadius:12,
  padding:'10px 12px',
  fontSize:14,
  boxSizing:'border-box',
  background:'#fff',
}
const textarea: CSSProperties = {
  ...input,
  minHeight:116,
  height:116,
  resize:'vertical',
}
const btn: CSSProperties = {
  border:0,
  borderRadius:12,
  padding:'11px 16px',
  background:'#991b1b',
  color:'#fff',
  fontWeight:700,
  cursor:'pointer',
}
const btnDark: CSSProperties = { ...btn, background:'#0f172a' }
const btnLight: CSSProperties = {
  ...btn,
  background:'#fff',
  color:'#111827',
  border:'1px solid #d1d5db',
}
const helper: CSSProperties = { color:'#64748b', fontSize:13 }

const compactActionBtn: CSSProperties = {
  minWidth: 82,
  padding: '8px 12px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
}

const equalDetailCard: CSSProperties = {
  border:'1px solid #e5e7eb',
  borderRadius:14,
  padding:16,
  minHeight:184,
  height:184,
  display:'flex',
  flexDirection:'column',
  justifyContent:'space-between',
  boxSizing:'border-box',
  overflow:'hidden',
}

const toastBase: CSSProperties = {
  position:'fixed',
  top:20,
  right:20,
  zIndex:9999,
  minWidth:280,
  maxWidth:420,
  borderRadius:14,
  border:'1px solid',
  padding:'14px 16px',
  boxShadow:'0 18px 40px rgba(15,23,42,0.16)',
  fontWeight:700,
}

function makeKey(prefix:string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function emptyBranch(defaultValue = true): FormBranch {
  return { client_key: makeKey('branch'), branch_name: defaultValue ? 'Merkez' : '', address: '', is_default: defaultValue }
}

function emptyContact(branchKey:string, defaultValue = true): FormContact {
  return { client_key: makeKey('contact'), branch_key: branchKey, full_name: '', phone: '', email: '', title: '', is_default: defaultValue }
}

function emptyForm(): CustomerForm {
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

function mapCustomerToForm(customer: Customer): CustomerForm {
  const branchKeyMap = new Map<number, string>()

  const branches: FormBranch[] = customer.branches.length
    ? customer.branches.map((branch, index) => {
        const key = makeKey(`branch-${branch.id || index}`)
        branchKeyMap.set(branch.id, key)
        return {
          client_key: key,
          source_id: branch.id,
          branch_name: branch.branch_name || '',
          address: branch.address || '',
          is_default: branch.is_default,
        }
      })
    : [emptyBranch(true)]

  const defaultBranchKey = branches.find(item => item.is_default)?.client_key || branches[0]?.client_key || ''

  const contacts: FormContact[] = customer.contacts.length
    ? customer.contacts.map((contact, index) => ({
        client_key: makeKey(`contact-${contact.id || index}`),
        source_id: contact.id,
        source_branch_id: contact.branch_id ?? null,
        branch_key: (contact.branch_id && branchKeyMap.get(contact.branch_id)) || defaultBranchKey,
        full_name: contact.full_name || '',
        phone: contact.phone || '',
        email: contact.email || '',
        title: contact.title || '',
        is_default: contact.is_default,
      }))
    : [emptyContact(defaultBranchKey, true)]

  return {
    customer_name: customer.customer_name || '',
    trade_name: customer.trade_name || '',
    tax_office: customer.tax_office || '',
    tax_number: customer.tax_number || '',
    branches,
    contacts,
  }
}

export default function CustomerListPage() {
  const [rows, setRows] = useState<Customer[]>([])
  const [query, setQuery] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<CustomerForm>(emptyForm())
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  async function load(q = '') {
    const res = await apiClient.get('/customers', { params: q.trim() ? { q } : {} })
    setRows(res.data.items || [])
  }

  useEffect(() => {
    load().catch(() => setError('Müşteri verileri alınamadı'))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load(query).catch(() => setError('Müşteri verileri alınamadı'))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(''), 3000)
    return () => window.clearTimeout(timer)
  }, [error])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(''), 3000)
    return () => window.clearTimeout(timer)
  }, [success])

  const branchOptions = useMemo(
    () => form.branches.map(item => ({ key:item.client_key, label:item.branch_name || 'Adsız Şube' })),
    [form.branches]
  )

  function resetFormState() {
    setEditingId(null)
    setForm(emptyForm())
  }

  function updateBranch(clientKey:string, patch: Partial<FormBranch>) {
    setForm(prev => ({
      ...prev,
      branches: prev.branches.map(item => {
        if (patch.is_default) {
          return { ...item, is_default: item.client_key === clientKey }
        }
        return item.client_key === clientKey ? { ...item, ...patch } : item
      }),
    }))
  }

  function updateContact(clientKey:string, patch: Partial<FormContact>) {
    setForm(prev => ({
      ...prev,
      contacts: prev.contacts.map(item => {
        if (patch.is_default) {
          return { ...item, is_default: item.client_key === clientKey }
        }
        return item.client_key === clientKey ? { ...item, ...patch } : item
      }),
    }))
  }

  function addBranch() {
    setForm(prev => ({ ...prev, branches: [...prev.branches, emptyBranch(false)] }))
  }

  function removeBranch(clientKey:string) {
    setForm(prev => {
      if (prev.branches.length === 1) return prev
      const remainingBranches = prev.branches.filter(item => item.client_key !== clientKey)
      const replacementBranch = remainingBranches.find(item => item.is_default) || remainingBranches[0]
      return {
        ...prev,
        branches: remainingBranches.map((item, index) => ({
          ...item,
          is_default: replacementBranch ? item.client_key === replacementBranch.client_key : index === 0,
        })),
        contacts: prev.contacts.map(contact =>
          contact.branch_key === clientKey
            ? { ...contact, branch_key: replacementBranch.client_key }
            : contact
        ),
      }
    })
  }

  function addContact() {
    const defaultBranchKey = form.branches.find(item => item.is_default)?.client_key || form.branches[0]?.client_key || ''
    setForm(prev => ({ ...prev, contacts: [...prev.contacts, emptyContact(defaultBranchKey, false)] }))
  }

  function removeContact(clientKey:string) {
    setForm(prev => {
      if (prev.contacts.length === 1) return prev
      const remainingContacts = prev.contacts.filter(item => item.client_key !== clientKey)
      const replacement = remainingContacts.find(item => item.is_default) || remainingContacts[0]
      return {
        ...prev,
        contacts: remainingContacts.map((item, index) => ({
          ...item,
          is_default: replacement ? item.client_key === replacement.client_key : index === 0,
        })),
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      customer_name: form.customer_name.trim(),
      trade_name: form.trade_name.trim(),
      tax_office: form.tax_office.trim(),
      tax_number: form.tax_number.trim(),
      branches: form.branches.map(item => ({
        id: item.source_id,
        client_key: item.client_key,
        branch_name: item.branch_name.trim(),
        address: item.address.trim(),
        is_default: item.is_default,
      })),
      contacts: form.contacts.map(item => ({
        id: item.source_id,
        client_key: item.client_key,
        branch_key: item.branch_key,
        full_name: item.full_name.trim(),
        phone: item.phone.trim(),
        email: item.email.trim(),
        title: item.title.trim(),
        is_default: item.is_default,
      })),
    }

    try {
      if (editingId) {
        await apiClient.put(`/customers/${editingId}`, payload)
        setSuccess('Müşteri güncellendi')
      } else {
        await apiClient.post('/customers', payload)
        setSuccess('Müşteri kaydedildi')
      }
      resetFormState()
      await load(query)
    } catch (err:any) {
      setError(err?.response?.data?.detail || (editingId ? 'Müşteri güncellenemedi' : 'Müşteri kaydedilemedi'))
    } finally {
      setSaving(false)
    }
  }

  async function handleImport() {
    if (!file) {
      setError('Önce Excel dosyasını seç')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await apiClient.post('/customers/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await load(query)
      setSuccess(`Excel içe aktarıldı. Satır: ${res.data.imported_rows}`)
    } catch (err:any) {
      setError(err?.response?.data?.detail || 'Excel içe aktarılamadı')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(row: Customer) {
    setError('')
    setSuccess('')
    setEditingId(row.id)
    setForm(mapCustomerToForm(row))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(row: Customer) {
    const ok = window.confirm(`"${row.customer_name}" kaydı pasife alınsın mı?`)
    if (!ok) return

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await apiClient.delete(`/customers/${row.id}`)
      if (editingId === row.id) resetFormState()
      if (expandedId === row.id) setExpandedId(null)
      await load(query)
      setSuccess('Müşteri pasife alındı')
    } catch (err:any) {
      setError(err?.response?.data?.detail || 'Müşteri pasife alınamadı')
    } finally {
      setSaving(false)
    }
  }

  function renderDetailRow(row: Customer) {
    return (
      <tr key={`detail-${row.id}`} style={{ background:'#f8fafc' }}>
        <td colSpan={5} style={{ padding:'0 14px 14px 14px' }}>
          <div
            style={{
              display:'grid',
              gap:16,
              padding:16,
              border:'1px solid #e5e7eb',
              borderRadius:16,
              background:'#fff',
            }}
          >
            <div
              style={{
                border:'1px solid #e5e7eb',
                borderRadius:14,
                padding:16,
                background:'#f8fafc',
                display:'grid',
                gridTemplateColumns:'1.2fr 1fr 1fr',
                gap:12,
              }}
            >
              <div>
                <div style={{ color:'#64748b', fontSize:12, marginBottom:6 }}>Ticari Unvan</div>
                <div style={{ fontWeight:800, color:'#111827' }}>{row.trade_name || '-'}</div>
              </div>
              <div>
                <div style={{ color:'#64748b', fontSize:12, marginBottom:6 }}>Vergi Dairesi</div>
                <div style={{ fontWeight:800, color:'#111827' }}>{row.tax_office || '-'}</div>
              </div>
              <div>
                <div style={{ color:'#64748b', fontSize:12, marginBottom:6 }}>Vergi No</div>
                <div style={{ fontWeight:800, color:'#111827' }}>{row.tax_number || '-'}</div>
              </div>
            </div>

            <div
              style={{
                display:'grid',
                gridTemplateColumns:'1fr 1fr',
                gap:18,
                alignItems:'start',
              }}
            >
              <div style={{ display:'grid', gap:12 }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#0f172a' }}>Şube Bilgileri</div>
                <div style={{ display:'grid', gap:12 }}>
                  {row.branches.length ? row.branches.map(branch => (
                    <div
                      key={branch.id}
                      style={{
                        ...equalDetailCard,
                        background: branch.is_default ? '#fff7ed' : '#fff',
                      }}
                    >
                      <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                        <div style={{ fontWeight:800, color:'#111827', fontSize:18 }}>{branch.branch_name || '-'}</div>
                        {branch.is_default ? (
                          <span
                            style={{
                              fontSize:12,
                              fontWeight:800,
                              color:'#9a3412',
                              background:'#ffedd5',
                              border:'1px solid #fdba74',
                              borderRadius:999,
                              padding:'4px 10px',
                            }}
                          >
                            Varsayılan
                          </span>
                        ) : null}
                      </div>
                      <div style={{ color:'#64748b', marginTop:12, lineHeight:1.55, overflowWrap:'anywhere' }}>
                        {branch.address || 'Adres bilgisi yok'}
                      </div>
                    </div>
                  )) : (
                    <div style={{ color:'#64748b' }}>Şube kaydı yok</div>
                  )}
                </div>
              </div>

              <div style={{ display:'grid', gap:12 }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#0f172a' }}>Yetkili Bilgileri</div>
                <div style={{ display:'grid', gap:12 }}>
                  {row.contacts.length ? row.contacts.map(contact => {
                    const branchName = row.branches.find(branch => branch.id === contact.branch_id)?.branch_name || '-'
                    return (
                      <div
                        key={contact.id}
                        style={{
                          ...equalDetailCard,
                          background: contact.is_default ? '#f8fafc' : '#fff',
                        }}
                      >
                        <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                          <div style={{ fontWeight:800, color:'#111827', fontSize:18 }}>{contact.full_name || '-'}</div>
                          {contact.is_default ? (
                            <span
                              style={{
                                fontSize:12,
                                fontWeight:800,
                                color:'#0f172a',
                                background:'#e2e8f0',
                                border:'1px solid #cbd5e1',
                                borderRadius:999,
                                padding:'4px 10px',
                              }}
                            >
                              Varsayılan
                            </span>
                          ) : null}
                        </div>
                        <div
                          style={{
                            color:'#64748b',
                            marginTop:12,
                            display:'grid',
                            gap:8,
                            lineHeight:1.5,
                          }}
                        >
                          <div><strong style={{ color:'#334155' }}>Görev:</strong> {contact.title || '-'}</div>
                          <div><strong style={{ color:'#334155' }}>Telefon:</strong> {contact.phone || '-'}</div>
                          <div><strong style={{ color:'#334155' }}>E-Posta:</strong> <span style={{ overflowWrap:'anywhere' }}>{contact.email || '-'}</span></div>
                          <div><strong style={{ color:'#334155' }}>Bağlı Şube:</strong> <span style={{ overflowWrap:'anywhere' }}>{branchName}</span></div>
                        </div>
                      </div>
                    )
                  }) : (
                    <div style={{ color:'#64748b' }}>Yetkili kaydı yok</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div style={pageWrap}>
      {error ? (
        <div style={{ ...toastBase, top:20, right:20, borderColor:'#fecaca', background:'#fff1f2', color:'#991b1b' }}>
          {error}
        </div>
      ) : null}

      {success ? (
        <div style={{ ...toastBase, top:20, right:20, borderColor:'#bbf7d0', background:'#f0fdf4', color:'#166534' }}>
          {success}
        </div>
      ) : null}

      <div style={{ display:'grid', gap:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ margin:0, fontSize:30, color:'#111827' }}>Müşteri Listesi</h1>
            <div style={{ color:'#64748b', marginTop:6 }}>Firma, şube ve birden fazla yetkili kişi yönetimi</div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <input type="file" accept=".xlsx,.xls" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
            <button type="button" style={btn} onClick={handleImport} disabled={saving}>
              {saving ? 'Yükleniyor...' : 'Excelden İçeri Aktar'}
            </button>
          </div>
        </div>

        <div style={{ ...card, display:'grid', gap:16 }}>
          <div>
            <h2 style={{ margin:'0 0 8px 0', fontSize:24 }}>
              {editingId ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
            </h2>
            <div style={helper}>
              {editingId
                ? 'Seçili müşteri kaydını güncelliyorsun.'
                : 'Bu formdan birden fazla şube ve birden fazla yetkili ekleyebilirsin.'}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:12 }}>
            <label style={{ display:'grid', gap:6 }}>
              Ticari Unvan
              <input style={input} value={form.trade_name} onChange={(e)=>setForm({ ...form, trade_name:e.target.value })} />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              Müşteri Adı
              <input style={input} value={form.customer_name} onChange={(e)=>setForm({ ...form, customer_name:e.target.value })} />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              Vergi D.
              <input style={input} value={form.tax_office} onChange={(e)=>setForm({ ...form, tax_office:e.target.value })} />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              Vergi No
              <input style={input} value={form.tax_number} onChange={(e)=>setForm({ ...form, tax_number:e.target.value })} />
            </label>
          </div>

          <div style={{ ...card, padding:16, background:'#f8fafc', boxShadow:'none' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:12, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800 }}>Şubeler</div>
                <div style={helper}>Her müşteri için birden fazla şube eklenebilir.</div>
              </div>
              <button type="button" style={btnLight} onClick={addBranch}>Şube Ekle</button>
            </div>

            <div style={{ display:'grid', gap:12 }}>
              {form.branches.map((branch, index) => (
                <div
                  key={branch.client_key}
                  style={{
                    border:'1px solid #e2e8f0',
                    borderRadius:14,
                    padding:14,
                    background:'#fff',
                    display:'grid',
                    gap:12,
                  }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <div style={{ fontWeight:800 }}>Şube {index + 1}</div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <label style={{ display:'flex', gap:6, alignItems:'center', color:'#334155' }}>
                        <input type="radio" checked={branch.is_default} onChange={() => updateBranch(branch.client_key, { is_default:true })} /> Varsayılan
                      </label>
                      <button type="button" style={btnLight} onClick={() => removeBranch(branch.client_key)} disabled={form.branches.length === 1}>
                        Sil
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display:'grid',
                      gridTemplateColumns:'240px minmax(0, 1fr)',
                      gap:12,
                      alignItems:'start',
                    }}
                  >
                    <label style={{ display:'grid', gap:8 }}>
                      <span>Şube / Lokasyon</span>
                      <input
                        style={{ ...input, height:44, minHeight:44, padding:'10px 12px' }}
                        value={branch.branch_name}
                        onChange={(e)=>updateBranch(branch.client_key, { branch_name:e.target.value })}
                      />
                    </label>

                    <label style={{ display:'grid', gap:8 }}>
                      <span>Adres</span>
                      <textarea
                        style={{ ...textarea, height:44, minHeight:44, resize:'none', padding:'10px 12px' }}
                        value={branch.address}
                        onChange={(e)=>updateBranch(branch.client_key, { address:e.target.value })}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding:16, background:'#f8fafc', boxShadow:'none' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:12, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800 }}>Yetkililer</div>
                <div style={helper}>Yetkilileri şubelere bağlayabilirsin.</div>
              </div>
              <button type="button" style={btnLight} onClick={addContact}>Yetkili Ekle</button>
            </div>

            <div style={{ display:'grid', gap:12 }}>
              {form.contacts.map((contact, index) => (
                <div
                  key={contact.client_key}
                  style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:14, background:'#fff', display:'grid', gap:12 }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <div style={{ fontWeight:800 }}>Yetkili {index + 1}</div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <label style={{ display:'flex', gap:6, alignItems:'center', color:'#334155' }}>
                        <input type="radio" checked={contact.is_default} onChange={() => updateContact(contact.client_key, { is_default:true })} /> Varsayılan
                      </label>
                      <button type="button" style={btnLight} onClick={() => removeContact(contact.client_key)} disabled={form.contacts.length === 1}>
                        Sil
                      </button>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 220px', gap:12 }}>
                    <label style={{ display:'grid', gap:6 }}>
                      Ad Soyad
                      <input style={input} value={contact.full_name} onChange={(e)=>updateContact(contact.client_key, { full_name:e.target.value })} />
                    </label>
                    <label style={{ display:'grid', gap:6 }}>
                      Telefon
                      <input style={input} value={contact.phone} onChange={(e)=>updateContact(contact.client_key, { phone:e.target.value })} />
                    </label>
                    <label style={{ display:'grid', gap:6 }}>
                      E-Posta
                      <input style={input} value={contact.email} onChange={(e)=>updateContact(contact.client_key, { email:e.target.value })} />
                    </label>
                    <label style={{ display:'grid', gap:6 }}>
                      Görev
                      <input style={input} value={contact.title} onChange={(e)=>updateContact(contact.client_key, { title:e.target.value })} />
                    </label>
                    <label style={{ display:'grid', gap:6 }}>
                      Bağlı Şube
                      <select style={input} value={contact.branch_key} onChange={(e)=>updateContact(contact.client_key, { branch_key:e.target.value })}>
                        {branchOptions.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
            {editingId ? (
              <button type="button" style={btnLight} onClick={resetFormState}>İptal</button>
            ) : null}
            <button type="button" style={btnLight} onClick={() => { setError(''); setSuccess(''); resetFormState() }}>
              Temizle
            </button>
            <button type="button" style={btn} onClick={handleSave} disabled={saving}>
              {saving ? (editingId ? 'Güncelleniyor...' : 'Kaydediliyor...') : (editingId ? 'Güncellemeyi Kaydet' : 'Müşteri Kaydet')}
            </button>
          </div>
        </div>

        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', marginBottom:14, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <h2 style={{ margin:0 }}>Kayıtlı Müşteriler</h2>
              <span
                style={{
                  fontSize:13,
                  fontWeight:800,
                  color:'#0f172a',
                  background:'#f1f5f9',
                  border:'1px solid #cbd5e1',
                  borderRadius:999,
                  padding:'5px 10px',
                }}
              >
                Toplam: {rows.length}
              </span>
            </div>

            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <input
                style={{ ...input, width:320 }}
                placeholder="Müşteri, şube, yetkili veya vergi no ara"
                value={query}
                onChange={(e)=>setQuery(e.target.value)}
              />
              <button type="button" style={btnLight} onClick={() => setQuery('')}>
                Temizle
              </button>
            </div>
          </div>

          <div style={{ width:'100%', overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:0, minWidth:980 }}>
              <thead>
                <tr style={{ background:'#0f172a' }}>
                  {['No', 'Müşteri Adı', 'Şube', 'Yetkili', 'İşlem'].map((h, index, arr) => (
                    <th
                      key={h}
                      style={{
                        color:'#fff',
                        textAlign:'left',
                        padding:'14px 12px',
                        fontSize:14,
                        borderTopLeftRadius:index === 0 ? 14 : 0,
                        borderTopRightRadius:index === arr.length - 1 ? 14 : 0,
                        whiteSpace:'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => {
                  const isExpanded = expandedId === row.id
                  const defaultBranch = row.branches.find(branch => branch.is_default) || row.branches[0]
                  const defaultContact = row.contacts.find(contact => contact.is_default) || row.contacts[0]

                  return (
                    <>
                      <tr
                        key={row.id}
                        style={{
                          borderTop:'1px solid #e5e7eb',
                          background:isExpanded ? '#f8fafc' : '#fff',
                          cursor:'pointer',
                        }}
                        onClick={() => setExpandedId(prev => prev === row.id ? null : row.id)}
                      >
                        <td style={{ padding:'14px 12px', borderBottom:'1px solid #eef2f7', color:'#334155', fontWeight:700, whiteSpace:'nowrap' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding:'14px 12px', borderBottom:'1px solid #eef2f7', fontWeight:700, color:'#111827', whiteSpace:'nowrap' }}>
                          {row.customer_name}
                        </td>
                        <td style={{ padding:'14px 12px', borderBottom:'1px solid #eef2f7', minWidth:160 }}>
                          <div style={{ display:'grid', gap:4 }}>
                            <div style={{ fontWeight:700, color:'#111827' }}>{row.branches.length} şube</div>
                            <div style={{ color:'#64748b', fontSize:13, lineHeight:1.4 }}>
                              {defaultBranch ? `${defaultBranch.branch_name}${defaultBranch.is_default ? ' • Varsayılan' : ''}` : '-'}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'14px 12px', borderBottom:'1px solid #eef2f7', minWidth:180 }}>
                          <div style={{ display:'grid', gap:4 }}>
                            <div style={{ fontWeight:700, color:'#111827' }}>{row.contacts.length} yetkili</div>
                            <div style={{ color:'#64748b', fontSize:13, lineHeight:1.4 }}>
                              {defaultContact ? `${defaultContact.full_name}${defaultContact.is_default ? ' • Varsayılan' : ''}` : '-'}
                            </div>
                          </div>
                        </td>
                        <td
                          style={{ padding:'14px 12px', borderBottom:'1px solid #eef2f7', minWidth:160 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                            <button type="button" style={{ ...btnLight, ...compactActionBtn }} onClick={() => handleEdit(row)}>
                              Düzenle
                            </button>
                            <button type="button" style={{ ...btnDark, ...compactActionBtn }} onClick={() => setExpandedId(prev => prev === row.id ? null : row.id)}>
                              {isExpanded ? 'Kapat' : 'Detay'}
                            </button>
                            <button
                              type="button"
                              style={{ ...btnLight, ...compactActionBtn, borderColor:'#fecaca', color:'#991b1b', background:'#fff1f2' }}
                              onClick={() => handleDelete(row)}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? renderDetailRow(row) : null}
                    </>
                  )
                })}

                {!rows.length ? (
                  <tr>
                    <td colSpan={5} style={{ padding:18, textAlign:'center', color:'#64748b' }}>
                      Kayıt bulunamadı
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
