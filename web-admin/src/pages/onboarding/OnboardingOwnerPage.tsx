import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { createBarbershop } from '../../services/barbershops'
import { useAuth } from '../../contexts/AuthContext'
import styles from './OnboardingPage.module.css'

const DEFAULT_HOURS = {
  monday:    { open: true,  from: '09:00', to: '20:00' },
  tuesday:   { open: true,  from: '09:00', to: '20:00' },
  wednesday: { open: true,  from: '09:00', to: '20:00' },
  thursday:  { open: true,  from: '09:00', to: '20:00' },
  friday:    { open: true,  from: '09:00', to: '20:00' },
  saturday:  { open: true,  from: '10:00', to: '18:00' },
  sunday:    { open: false, from: '10:00', to: '14:00' },
}

export default function OnboardingOwnerPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!address.trim()) { setError('La dirección es obligatoria'); return }
    if (!phone.trim()) { setError('El teléfono es obligatorio'); return }

    setLoading(true)
    setError('')
    try {
      const shopId = await createBarbershop({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        ownerId: user.uid,
        services: [],
        barbers: [],
        openingHours: DEFAULT_HOURS as any,
      })
      await updateDoc(doc(db, 'users', user.uid), { barbershopId: shopId })
      await refreshUser()
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      console.error(err)
      setError('Error al crear la barbería. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>🏪</div>
        <h1 className={styles.title}>Crea tu barbería</h1>
        <p className={styles.subtitle}>
          Solo necesitas unos datos básicos para empezar.<br />
          Podrás editar todo después desde el panel.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Nombre de la barbería *</label>
            <input
              type="text"
              placeholder="Ej: The Classic Barber"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label>Dirección *</label>
            <input
              type="text"
              placeholder="Ej: Calle Gran Vía 12, Madrid"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label>Teléfono de contacto *</label>
            <input
              type="tel"
              placeholder="Ej: 612 345 678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Creando barbería...' : 'Crear mi barbería →'}
          </button>
        </form>

        <button onClick={logout} className={styles.logoutLink}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
