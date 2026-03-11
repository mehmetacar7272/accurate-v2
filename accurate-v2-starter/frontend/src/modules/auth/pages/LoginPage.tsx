import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../../api/client'

export function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('1234')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await apiClient.post('/auth/login', { username, password })
      navigate('/dashboard')
    } catch {
      setError('Giriş yapılamadı')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f6f7fb', fontFamily: 'Arial, sans-serif' }}>
      <form onSubmit={handleSubmit} style={{ width: 360, background: 'white', border: '1px solid #e5e7eb', borderRadius: 18, padding: 24, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0 }}>ACCURATE V2 Giriş</h2>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Kullanıcı adı" style={{ padding: 12, borderRadius: 10, border: '1px solid #d1d5db' }} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifre" style={{ padding: 12, borderRadius: 10, border: '1px solid #d1d5db' }} />
        <button type="submit" style={{ padding: 12, borderRadius: 10, border: 0, background: '#b91c1c', color: 'white', fontWeight: 700 }}>Giriş Yap</button>
        {error ? <div style={{ color: '#b91c1c' }}>{error}</div> : null}
      </form>
    </div>
  )
}
