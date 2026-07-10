import { useState } from 'react'
import { User } from '../../types'
import { getUsersByBarbershop } from '../../services/users'
import styles from '../../pages/owner/OwnerDashboard.module.css'

interface EmployeeManagementProps {
  barbershopId: string
  barbers: User[]
  onUpdate: (updated: User[]) => void
}

export default function EmployeeManagement({
  barbershopId,
  barbers,
  onUpdate,
}: EmployeeManagementProps) {
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // TODO: Implementar creación de barbero via API
      // Por ahora solo mostrar mensaje de éxito
      setMessage({ type: 'success', text: 'Función de creación de barberos próximamente' })
      setTimeout(() => {
        setMessage(null)
        setShowModal(false)
      }, 2000)
    } catch (err) {
      console.error('Error adding barber:', err)
      setMessage({ type: 'error', text: 'Error al agregar barbero' })
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = async () => {
    try {
      const updated = await getUsersByBarbershop(barbershopId)
      const barbersOnly = updated.filter(u => u.role === 'barber' || u.role === 'owner')
      onUpdate(barbersOnly)
      setMessage({ type: 'success', text: 'Actualizado' })
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      console.error('Error refreshing barbers:', err)
      setMessage({ type: 'error', text: 'Error al actualizar' })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setShowModal(true)}
          className={styles.button}
        >
          + Agregar Barbero
        </button>
        <button
          onClick={handleRefresh}
          className={styles.buttonSecondary}
        >
          Actualizar
        </button>
      </div>

      {message && (
        <div style={{ marginBottom: '16px' }}>
          <div className={message.type === 'success' ? styles.success : styles.error}>
            {message.text}
          </div>
        </div>
      )}

      {barbers.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No hay barberos registrados</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Nombre</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Teléfono</th>
                <th className={styles.th}>Rol</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {barbers.map(barber => (
                <tr key={barber.uid} className={styles.tr}>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {barber.photoURL ? (
                        <img
                          src={barber.photoURL}
                          alt=""
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#222',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: '#999',
                        }}>
                          {barber.displayName[0]}
                        </div>
                      )}
                      <span>{barber.displayName}</span>
                    </div>
                  </td>
                  <td className={styles.td}>{barber.email}</td>
                  <td className={styles.td}>{barber.phone || '—'}</td>
                  <td className={styles.td}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: '#222',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#c9a84c',
                    }}>
                      {barber.role === 'owner' ? 'Propietario' : 'Barbero'}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actionButtons}>
                      <button className={styles.iconButton} title="Editar">✏️</button>
                      <button className={`${styles.iconButton} ${styles.iconButtonDanger}`} title="Eliminar">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Agregar Barbero</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nombre Completo</label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
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
                />
              </div>

              {message && (
                <div className={message.type === 'success' ? styles.success : styles.error}>
                  {message.text}
                </div>
              )}

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.button}
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
