import { useState } from 'react'
import { Barbershop } from '../../types'
import { updateBarbershop } from '../../services/barbershops'
import styles from '../../pages/owner/OwnerDashboard.module.css'

interface BarbershopSettingsProps {
  barbershop: Barbershop
  onUpdate: (updated: Barbershop) => void
}

interface DayHours {
  from: string
  to: string
  open: boolean
}

interface FormData {
  name: string
  address: string
  phone: string
  latitude: string
  longitude: string
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours
}

export default function BarbershopSettings({
  barbershop,
  onUpdate,
}: BarbershopSettingsProps) {
  const [formData, setFormData] = useState<FormData>({
    name: barbershop.name,
    address: barbershop.address,
    phone: barbershop.phone,
    latitude: barbershop.latitude != null ? String(barbershop.latitude) : '',
    longitude: barbershop.longitude != null ? String(barbershop.longitude) : '',
    ...(barbershop.openingHours as Omit<FormData, 'name' | 'address' | 'phone' | 'latitude' | 'longitude'>),
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleHoursChange = (day: string, field: 'from' | 'to', value: string) => {
    setFormData(prev => {
      const dayData = prev[day as keyof FormData] as DayHours || {}
      return {
        ...prev,
        [day]: {
          ...dayData,
          [field]: value,
        },
      }
    })
  }

  const handleOpenChange = (day: string, open: boolean) => {
    setFormData(prev => {
      const dayData = prev[day as keyof FormData] as DayHours || {}
      return {
        ...prev,
        [day]: {
          ...dayData,
          open,
        },
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const openingHours = {
        monday: formData.monday,
        tuesday: formData.tuesday,
        wednesday: formData.wednesday,
        thursday: formData.thursday,
        friday: formData.friday,
        saturday: formData.saturday,
        sunday: formData.sunday,
      }

      const updatePayload: Partial<Barbershop> = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        openingHours,
      }
      if (formData.latitude.trim()) updatePayload.latitude = parseFloat(formData.latitude)
      if (formData.longitude.trim()) updatePayload.longitude = parseFloat(formData.longitude)

      await updateBarbershop(barbershop.id, updatePayload)

      onUpdate({
        ...barbershop,
        ...updatePayload,
      })

      setMessage({ type: 'success', text: 'Cambios guardados correctamente' })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setMessage({ type: 'error', text: 'Error al guardar los cambios' })
    } finally {
      setSaving(false)
    }
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  return (
    <div className={styles.settingsContainer}>
      <form onSubmit={handleSubmit} className={styles.settingsForm}>
        {/* Información básica */}
        <div className={styles.card} style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Información Básica</h3>

          <div className={styles.formGroup}>
            <label className={styles.label}>Nombre de la Barbería</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Dirección</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Latitud GPS</label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                className={styles.input}
                placeholder="Ej: 40.416775"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Longitud GPS</label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                className={styles.input}
                placeholder="Ej: -3.703790"
              />
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#888', margin: '-4px 0 0' }}>
            Busca tu barbería en{' '}
            <a href="https://maps.google.com" target="_blank" rel="noreferrer" style={{ color: '#C9A84C' }}>
              Google Maps
            </a>
            {' '}→ clic derecho → "¿Qué hay aquí?" para obtener las coordenadas
          </p>
        </div>

        {/* Horario de apertura */}
        <div className={styles.card} style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Horario de Apertura</h3>

          <div className={styles.hoursGrid}>
            {days.map((day, idx) => {
              const hours = formData[day as keyof typeof formData] as any
              return (
                <div key={day} className={styles.dayHours}>
                  <h4>{dayLabels[idx]}</h4>
                  <div className={styles.dayHoursInputs}>
                    <div className={styles.checkboxGroup}>
                      <input
                        type="checkbox"
                        id={`${day}-open`}
                        checked={hours?.open ?? false}
                        onChange={e => handleOpenChange(day, e.target.checked)}
                        className={styles.checkbox}
                      />
                      <label htmlFor={`${day}-open`} className={styles.checkboxLabel}>
                        Abierto
                      </label>
                    </div>

                    {hours?.open && (
                      <>
                        <input
                          type="time"
                          value={hours?.from ?? '09:00'}
                          onChange={e => handleHoursChange(day, 'from', e.target.value)}
                          className={styles.input}
                          style={{ fontSize: '12px', padding: '6px' }}
                        />
                        <input
                          type="time"
                          value={hours?.to ?? '18:00'}
                          onChange={e => handleHoursChange(day, 'to', e.target.value)}
                          className={styles.input}
                          style={{ fontSize: '12px', padding: '6px' }}
                        />
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {message && (
          <div className={message.type === 'success' ? styles.success : styles.error}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          className={styles.button}
          disabled={saving}
          style={{ alignSelf: 'flex-start' }}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  )
}
