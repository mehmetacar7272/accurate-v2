import React, { useEffect, useMemo, useState } from 'react'

type InspectionType = {
  id: number
  code: string
  name: string
  category?: string | null
  is_active: boolean
  sort_order: number
  version_no: number
}

type InspectionTest = {
  id: number
  code: string
  name: string
  short_name?: string | null
  description?: string | null
  unit_label?: string | null
  is_active: boolean
  sort_order: number
  version_no: number
}

type InspectionTypeTestLink = {
  id: number
  inspection_type_id: number
  inspection_test_id: number
  inspection_test: InspectionTest
  is_required: boolean
  is_default_selected: boolean
  is_active: boolean
  sort_order: number
  display_name_override?: string | null
  notes?: string | null
  version_no: number
}

type TextTemplate = {
  id: number
  template_type: string
  title: string
  body_text: string
  is_active: boolean
  version_no: number
}

const API_BASE = 'http://127.0.0.1:8000/api/v1/operations'

export default function InspectionDefinitionsPage() {
  const [loading, setLoading] = useState(true)
  const [types, setTypes] = useState<InspectionType[]>([])
  const [tests, setTests] = useState<InspectionTest[]>([])
  const [templates, setTemplates] = useState<TextTemplate[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const [typeTests, setTypeTests] = useState<InspectionTypeTestLink[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>('')

  const [newType, setNewType] = useState({
    code: '',
    name: '',
    category: '',
    sort_order: 0,
  })

  const [newTest, setNewTest] = useState({
    code: '',
    name: '',
    short_name: '',
    description: '',
    unit_label: '',
    sort_order: 0,
  })

  const [newTemplate, setNewTemplate] = useState({
    template_type: '',
    title: '',
    body_text: '',
  })
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)

  const [newLink, setNewLink] = useState({
    inspection_test_id: '',
    is_required: false,
    is_default_selected: false,
    sort_order: 0,
    display_name_override: '',
    notes: '',
  })

  async function fetchJson(url: string, init?: RequestInit) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`${response.status} | ${errorText}`)
    }

    return response.json()
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [typesData, testsData, templatesData] = await Promise.all([
        fetchJson(`${API_BASE}/admin/inspection-types`),
        fetchJson(`${API_BASE}/admin/inspection-tests`),
        fetchJson(`${API_BASE}/admin/text-templates`),
      ])

      setTypes(typesData)
      setTests(testsData)
      setTemplates(templatesData)

      const firstId = selectedTypeId ?? typesData?.[0]?.id ?? null
      setSelectedTypeId(firstId)

      if (firstId) {
        const linkData = await fetchJson(
          `${API_BASE}/admin/inspection-types/${firstId}/tests`
        )
        setTypeTests(linkData)
      } else {
        setTypeTests([])
      }
    } catch (error) {
      console.error(error)
      setMessage('Tanımlar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  const loadTypeTests = async (inspectionTypeId: number) => {
    try {
      const linkData = await fetchJson(
        `${API_BASE}/admin/inspection-types/${inspectionTypeId}/tests`
      )
      setTypeTests(linkData)
    } catch (error) {
      console.error(error)
      setMessage('Muayene türü testleri yüklenemedi.')
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (selectedTypeId) {
      loadTypeTests(selectedTypeId)
    }
  }, [selectedTypeId])

  const selectedType = useMemo(
    () => types.find((x) => x.id === selectedTypeId) ?? null,
    [types, selectedTypeId]
  )

  const seedDefinitions = async () => {
    setBusy(true)
    setMessage('')
    try {
      await fetchJson(`${API_BASE}/admin/seed-definitions`, { method: 'POST' })
      setMessage('Seed işlemi tamamlandı.')
      await loadAll()
    } catch (error) {
      console.error(error)
      setMessage('Seed işlemi başarısız.')
    } finally {
      setBusy(false)
    }
  }

  const createType = async () => {
    setBusy(true)
    setMessage('')
    try {
      await fetchJson(`${API_BASE}/admin/inspection-types`, {
        method: 'POST',
        body: JSON.stringify({
          ...newType,
          sort_order: Number(newType.sort_order || 0),
        }),
      })
      setNewType({ code: '', name: '', category: '', sort_order: 0 })
      setMessage('Muayene türü eklendi.')
      await loadAll()
    } catch (error) {
      console.error(error)
      setMessage('Muayene türü eklenemedi.')
    } finally {
      setBusy(false)
    }
  }

  const createTest = async () => {
    setBusy(true)
    setMessage('')
    try {
      await fetchJson(`${API_BASE}/admin/inspection-tests`, {
        method: 'POST',
        body: JSON.stringify({
          ...newTest,
          sort_order: Number(newTest.sort_order || 0),
        }),
      })
      setNewTest({
        code: '',
        name: '',
        short_name: '',
        description: '',
        unit_label: '',
        sort_order: 0,
      })
      setMessage('Test eklendi.')
      await loadAll()
    } catch (error) {
      console.error(error)
      setMessage('Test eklenemedi.')
    } finally {
      setBusy(false)
    }
  }

  const resetTemplateForm = () => {
    setNewTemplate({
      template_type: '',
      title: '',
      body_text: '',
    })
    setEditingTemplateId(null)
  }

  const startTemplateRevision = (item: TextTemplate) => {
    setEditingTemplateId(item.id)
    setNewTemplate({
      template_type: item.template_type,
      title: item.title,
      body_text: item.body_text,
    })
    setMessage(`Revize modu açıldı: ${item.title}`)
  }

  const createTemplate = async () => {
    setBusy(true)
    setMessage('')
    try {
      if (editingTemplateId) {
        try {
          await fetchJson(`${API_BASE}/admin/text-templates/${editingTemplateId}`, {
            method: 'PUT',
            body: JSON.stringify(newTemplate),
          })
        } catch (putError) {
          await fetchJson(`${API_BASE}/admin/text-templates/${editingTemplateId}`, {
            method: 'PATCH',
            body: JSON.stringify(newTemplate),
          })
        }
        setMessage('Metin şablonu revize edildi.')
      } else {
        await fetchJson(`${API_BASE}/admin/text-templates`, {
          method: 'POST',
          body: JSON.stringify(newTemplate),
        })
        setMessage('Metin şablonu eklendi.')
      }
      resetTemplateForm()
      await loadAll()
    } catch (error) {
      console.error(error)
      setMessage(editingTemplateId ? 'Metin şablonu revize edilemedi.' : 'Metin şablonu eklenemedi.')
    } finally {
      setBusy(false)
    }
  }

  const attachTestToType = async () => {
    if (!selectedTypeId || !newLink.inspection_test_id) return
    setBusy(true)
    setMessage('')
    try {
      const linkData = await fetchJson(`${API_BASE}/admin/inspection-types/${selectedTypeId}/tests`, {
  method: 'POST',
  body: JSON.stringify({
    ...newLink,
    inspection_test_id: Number(newLink.inspection_test_id),
    sort_order: Number(newLink.sort_order || 0),
  }),
})

setTypeTests(linkData)
      setNewLink({
        inspection_test_id: '',
        is_required: false,
        is_default_selected: false,
        sort_order: 0,
        display_name_override: '',
        notes: '',
      })
      setMessage('Test muayene türüne bağlandı.')
      
    } catch (error) {
      console.error(error)
      setMessage('Test bağlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="p-6">Yükleniyor...</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Muayene Tanım Motoru
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Muayene türleri, test havuzu, eşlemeler ve metin şablonları
          </p>
        </div>

        <button
          onClick={seedDefinitions}
          disabled={busy}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Örnek Verileri Yükle
        </button>
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Muayene Türleri</h2>

          <div className="mb-4 grid grid-cols-1 gap-3">
            <input
              value={newType.code}
              onChange={(e) => setNewType((p) => ({ ...p, code: e.target.value }))}
              placeholder="Kod"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <input
              value={newType.name}
              onChange={(e) => setNewType((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ad"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <input
              value={newType.category}
              onChange={(e) => setNewType((p) => ({ ...p, category: e.target.value }))}
              placeholder="Kategori"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <input
              type="number"
              value={newType.sort_order}
              onChange={(e) => setNewType((p) => ({ ...p, sort_order: Number(e.target.value) }))}
              placeholder="Sıra"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <button
              onClick={createType}
              disabled={busy || !newType.code || !newType.name}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Muayene Türü Ekle
            </button>
          </div>

          <div className="space-y-2">
            {types.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedTypeId(item.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left ${
                  selectedTypeId === item.id
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="font-semibold text-slate-900">{item.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Test Havuzu</h2>

          <div className="mb-4 grid grid-cols-1 gap-3">
            <input
              value={newTest.code}
              onChange={(e) => setNewTest((p) => ({ ...p, code: e.target.value }))}
              placeholder="Kod"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <input
              value={newTest.name}
              onChange={(e) => setNewTest((p) => ({ ...p, name: e.target.value }))}
              placeholder="Test Adı"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <input
              value={newTest.short_name}
              onChange={(e) => setNewTest((p) => ({ ...p, short_name: e.target.value }))}
              placeholder="Kısa Ad"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <input
              value={newTest.unit_label}
              onChange={(e) => setNewTest((p) => ({ ...p, unit_label: e.target.value }))}
              placeholder="Birim"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <textarea
              rows={3}
              value={newTest.description}
              onChange={(e) => setNewTest((p) => ({ ...p, description: e.target.value }))}
              placeholder="Açıklama"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <button
              onClick={createTest}
              disabled={busy || !newTest.code || !newTest.name}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Test Ekle
            </button>
          </div>

          <div className="space-y-2">
            {tests.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-3">
                <div className="font-semibold text-slate-900">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Tür-Test Eşlemesi
          </h2>

          <div className="mb-3 text-sm text-slate-600">
            Seçili Tür: <span className="font-semibold">{selectedType?.name || '-'}</span>
          </div>

          {selectedTypeId ? (
            <div className="mb-4 grid grid-cols-1 gap-3">
              <select
                value={newLink.inspection_test_id}
                onChange={(e) =>
                  setNewLink((p) => ({ ...p, inspection_test_id: e.target.value }))
                }
                className="rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">Test seç</option>
                {tests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.name}
                  </option>
                ))}
              </select>

              <input
                value={newLink.display_name_override}
                onChange={(e) =>
                  setNewLink((p) => ({ ...p, display_name_override: e.target.value }))
                }
                placeholder="Görünen ad override"
                className="rounded-xl border border-slate-300 px-3 py-2"
              />

              <input
                type="number"
                value={newLink.sort_order}
                onChange={(e) =>
                  setNewLink((p) => ({ ...p, sort_order: Number(e.target.value) }))
                }
                placeholder="Sıra"
                className="rounded-xl border border-slate-300 px-3 py-2"
              />

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={newLink.is_required}
                  onChange={(e) =>
                    setNewLink((p) => ({ ...p, is_required: e.target.checked }))
                  }
                />
                Zorunlu
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={newLink.is_default_selected}
                  onChange={(e) =>
                    setNewLink((p) => ({
                      ...p,
                      is_default_selected: e.target.checked,
                    }))
                  }
                />
                Varsayılan seçili
              </label>

              <textarea
                rows={2}
                value={newLink.notes}
                onChange={(e) => setNewLink((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Not"
                className="rounded-xl border border-slate-300 px-3 py-2"
              />

              <button
                onClick={attachTestToType}
                disabled={busy || !newLink.inspection_test_id}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Türe Test Bağla
              </button>
            </div>
          ) : null}

          <div className="space-y-2">
            {typeTests.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-3">
                <div className="font-semibold text-slate-900">
                  {item.display_name_override || item.inspection_test.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Metin Şablonları</h2>

          <div className="mb-4 grid grid-cols-1 gap-3">
            <input
              value={newTemplate.template_type}
              onChange={(e) =>
                setNewTemplate((p) => ({ ...p, template_type: e.target.value }))
              }
              placeholder="Şablon Türü"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <input
              value={newTemplate.title}
              onChange={(e) =>
                setNewTemplate((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Başlık"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <textarea
              rows={5}
              value={newTemplate.body_text}
              onChange={(e) =>
                setNewTemplate((p) => ({ ...p, body_text: e.target.value }))
              }
              placeholder="Metin"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={createTemplate}
                disabled={busy || !newTemplate.template_type || !newTemplate.title}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {editingTemplateId ? 'Revizyonu Kaydet' : 'Metin Şablonu Ekle'}
              </button>
              {editingTemplateId ? (
                <button
                  onClick={resetTemplateForm}
                  disabled={busy}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                >
                  Vazgeç
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            {templates.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900">{item.title}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{item.template_type}</div>
                  </div>
                  <button
                    onClick={() => startTemplateRevision(item)}
                    disabled={busy}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                  >
                    Revize Et
                  </button>
                </div>
                <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                  {item.body_text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}