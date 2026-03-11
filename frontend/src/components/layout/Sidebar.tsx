import { Link } from 'react-router-dom'

const items = [
  'Dashboard', 'Müşteriler', 'Personel', 'Cihazlar', 'Talepler', 'Teklifler', 'Protokoller', 'İş Emirleri', 'Saha Çalışmaları', 'Raporlar', 'Muayene Arşivi', 'Kalite Yönetim Sistemi'
]

export function Sidebar() {
  return (
    <aside style={{ background: '#111827', color: 'white', padding: 20 }}>
      <h2 style={{ marginTop: 0 }}>ACCURATE V2</h2>
      <div style={{ fontSize: 12, opacity: .7, marginBottom: 20 }}>Sprint 1 başlangıç iskeleti</div>
      <nav style={{ display: 'grid', gap: 10 }}>
        <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', padding: '10px 12px', background: '#1f2937', borderRadius: 10 }}>Dashboard</Link>
        {items.slice(1).map((item) => (
          <div key={item} style={{ padding: '10px 12px', background: '#0f172a', borderRadius: 10, opacity: .75 }}>{item}</div>
        ))}
      </nav>
    </aside>
  )
}
