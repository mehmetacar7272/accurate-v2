import { NavLink } from 'react-router-dom'

const placeholderItems = [
  'Personel', 'Cihazlar', 'İş Emirleri', 'Saha Çalışmaları', 'Raporlar', 'Muayene Arşivi'
]

const baseLinkStyle = {
  color: 'white',
  textDecoration: 'none',
  padding: '11px 12px',
  borderRadius: 12,
  fontWeight: 700,
  border: '1px solid transparent',
}

function navStyle({ isActive }: { isActive: boolean }) {
  return {
    ...baseLinkStyle,
    background: isActive ? '#7f1d1d' : '#1f2937',
    borderColor: isActive ? '#fca5a5' : 'transparent',
    boxShadow: isActive ? 'inset 3px 0 0 #fff' : 'none',
  }
}

export function Sidebar() {
  return (
    <aside style={{ background: '#111827', color: 'white', padding: 20 }}>
      <h2 style={{ marginTop: 0 }}>ACCURATE V2</h2>
      <div style={{ fontSize: 12, opacity: .7, marginBottom: 20 }}>Temiz mimari çalışma alanı</div>
      <nav style={{ display: 'grid', gap: 10 }}>
        <NavLink to="/dashboard" style={navStyle}>Dashboard</NavLink>
        <NavLink to="/operations/tasks" style={navStyle}>Görevler</NavLink>
        <NavLink to="/customers" style={navStyle}>Müşteri Listesi</NavLink>
        <NavLink to="/requests" style={navStyle}>Talepler</NavLink>
        <NavLink to="/offers" end style={navStyle}>Teklifler</NavLink>
        <NavLink to="/offers/approved" style={navStyle}>Onaylı Teklifler</NavLink>
        <NavLink to="/protocols" style={navStyle}>Protokoller</NavLink>
        <NavLink to="/quality/documents" style={navStyle}>Kalite Dokümanları</NavLink>
        <NavLink to="/admin/inspection-definitions" style={navStyle}>Muayene Tanımları</NavLink>
        {placeholderItems.map((item) => (
          <div key={item} style={{ padding: '10px 12px', background: '#0f172a', borderRadius: 10, opacity: .75 }}>{item}</div>
        ))}
      </nav>
    </aside>
  )
}
