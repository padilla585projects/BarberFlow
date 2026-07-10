import { useState } from 'react'
import { Barbershop, Service } from '../../types'
import { updateBarbershop } from '../../services/barbershops'
import styles from '../../pages/owner/OwnerDashboard.module.css'

interface ServiceManagementProps {
  barbershop: Barbershop
  onUpdate: (updated: Barbershop) => void
}

export default function ServiceManagement({
  barbershop,
  onUpdate,
}: ServiceManagementProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    duration: 30,
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
  }

  const handleAdd = () => {
    setEditingId(null)
    setFormData({ name: '', price: 0, duration: 30, description: '' })
    setShowModal(true)
  }

  const handleEdit = (service: Service) => {
    setEditingId(service.id)
    setFormData({
      name: service.name,
      price: service.price,
      duration: service.duration,
      description: service.description || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const services = [...(barbershop.services || [])]

      if (editingId) {
        const idx = services.findIndex(s => s.id === editingId)
        services[idx] = {
          ...services[idx],
          name: formData.name,
          price: formData.price,
          duration: formData.duration,
          description: formData.description || undefined,
        }
      } else {
        services.push({
          id: `srv-${Date.now()}`,
          name: formData.name,
          price: formData.price,
          duration: formData.duration,
          description: formData.description || undefined,
        })
      }

      await updateBarbershop(barbershop.id, { services })
      onUpdate({ ...barbershop, services })

      setMessage({ type: 'success', text: editingId ? 'Servicio actualizado' : 'Servicio agregado' })
      setTimeout(() => {
        setMessage(null)
        setShowModal(false)
      }, 2000)
    } catch (err) {
      console.error('Error saving service:', err)
      setMessage({ type: 'error', text: 'Error al guardar el servicio' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (serviceId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este servicio?')) return

    setSaving(true)
    try {
      const services = (barbershop.services || []).filter(s => s.id !== serviceId)
      await updateBarbershop(barbershop.id, { services })
      onUpdate({ ...barbershop, services })
      setMessage({ type: 'success', text: 'Servicio eliminado' })
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      console.error('Error deleting service:', err)
      setMessage({ type: 'error', text: 'Error al eliminar el servicio' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={handleAdd}
          className={styles.button}
        >
          + Agregar Servicio
        </button>
      </div>

      {message && (
        <div style={{ marginBottom: '16px' }}>
          <div className={message.type === 'success' ? styles.success : styles.error}>
            {message.text}
          </div>
        </div>
      )}

      {!barbershop.services || barbershop.services.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No hay servicios registrados</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Nombre</th>
                <th className={styles.th}>Precio</th>
                <th className={styles.th}>Duración</th>
                <th className={styles.th}>Descripción</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {barbershop.services.map(service => (
                <tr key={service.id} className={styles.tr}>
                  <td className={styles.td}>{service.name}</td>
                  <td className={styles.td}>{service.price.toFixed(2)}€</td>
                  <td className={styles.td}>{service.duration} min</td>
                  <td className={styles.td}>{service.description || '—'}</td>
                  <td className={styles.td}>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.iconButton}
                        onClick={() => handleEdit(service)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                        onClick={() => handleDelete(service.id)}
                        title="Eliminar"
                        disabled={saving}
                      >
                        🗑️
                      </button>
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
              <h2>{editingId ? 'Editar Servicio' : 'Agregar Servicio'}</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nombre del Servicio</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Precio (€)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className={styles.input}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Duración (min)</label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className={styles.input}
                    min="15"
                    step="15"
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Descripción</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={styles.textarea}
                  style={{ minHeight: '80px' }}
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
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
