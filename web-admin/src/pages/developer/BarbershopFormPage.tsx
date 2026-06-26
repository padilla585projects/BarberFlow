import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createBarbershop, getBarbershopById, updateBarbershop } from '../../services/barbershops'
import { Service } from '../../types'
import styles from './BarbershopFormPage.module.css'

const defaultHours = {
  open: true, from: '09:00', to: '20:00'
}
const defaultOpeningHours = {
  monday: { ...defaultHours },
  tuesday: { ...defaultHours },
  wednesday: { ...defaultHours },
  thursday: { ...defaultHours },
  friday: { ...defaultHours },
  saturday: { ...defaultHours },
  sunday: { open: false, from: '10:00', to: '14:00' },
}

export default function BarbershopFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id) && id !== 'new'

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [newService, setNewService] = useState({ name: '', duration: 30, price: 0 })

  useEffect(() => {
    if (!isEdit) return
    getBarbershopById(id!).then(shop => {
      if (!shop) return navigate('/barbershops')
      setName(shop.name)
      setAddress(shop.address)
      setPhone(shop.phone)
      setOwnerId(shop.ownerId)
      setServices(shop.services ?? [])
      setLoading(false)
    })
  }, [id])

  const addService = () => {
    if (!newService.name.trim()) return
    setServices(prev => [...prev, {
      ...newService,
      id: Date.now().toString(),
    }])
    setNewService({ name: '', duration: 30, price: 0 })
  }

  const removeService = (sid: string) => {
    setServices(prev => prev.filter(s => s.id !== sid))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const data = {
      name, address, phone, ownerId,
      services,
      barbers: [],
      openingHours: defaultOpeningHours,
    }
    try {
      if (isEdit) {
        await updateBarbershop(id!, data)
      } else {
        await createBarbershop(data)
      }
      navigate('/barbershops')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: 'white', padding: 40 }}>Cargando...</div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/barbershops')}>← Volver</button>
        <h1>{isEdit ? 'Editar barbería' : 'Nueva barbería'}</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h2>Información básica</h2>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label>Nombre de la barbería *</label>
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="Ej: BarberKing Madrid" />
            </div>
            <div className={styles.field}>
              <label>Teléfono *</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+34 600 000 000" />
            </div>
          </div>
          <div className={styles.field}>
            <label>Dirección *</label>
            <input value={address} onChange={e => setAddress(e.target.value)} required placeholder="Calle, número, ciudad" />
          </div>
          <div className={styles.field}>
            <label>UID del dueño</label>
            <input value={ownerId} onChange={e => setOwnerId(e.target.value)} placeholder="UID de Firebase del dueño" />
            <span className={styles.hint}>El dueño lo puede ver en su perfil del panel</span>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Servicios</h2>
          <div className={styles.servicesList}>
            {services.map(s => (
              <div key={s.id} className={styles.serviceChip}>
                <span>{s.name}</span>
                <span className={styles.chipMeta}>{s.duration}min · {s.price}€</span>
                <button type="button" onClick={() => removeService(s.id)} className={styles.removeBtn}>✕</button>
              </div>
            ))}
          </div>
          <div className={styles.addService}>
            <input
              value={newService.name}
              onChange={e => setNewService(p => ({ ...p, name: e.target.value }))}
              placeholder="Nombre del servicio"
              className={styles.serviceInput}
            />
            <input
              type="number"
              value={newService.duration}
              onChange={e => setNewService(p => ({ ...p, duration: +e.target.value }))}
              placeholder="Min"
              className={styles.serviceInputSm}
            />
            <input
              type="number"
              value={newService.price}
              onChange={e => setNewService(p => ({ ...p, price: +e.target.value }))}
              placeholder="€"
              className={styles.serviceInputSm}
            />
            <button type="button" onClick={addService} className={styles.addServiceBtn}>+ Añadir</button>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={() => navigate('/barbershops')} className={styles.cancelBtn}>
            Cancelar
          </button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear barbería'}
          </button>
        </div>
      </form>
    </div>
  )
}
