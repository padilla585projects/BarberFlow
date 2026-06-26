import { useEffect, useState } from 'react'
import { getAllBarbershops, getBarbershopById, updateBarbershop } from '../../services/barbershops'
import { getAppointmentsByBarbershop } from '../../services/appointments'
import { useAuth } from '../../contexts/AuthContext'
import { Barbershop, Service, Appointment } from '../../types'
import styles from './ServicesPage.module.css'

const EMPTY_FORM = { name: '', price: '', duration: '', description: '' }

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 75, 90, 120]

function genId() { return crypto.randomUUID() }

export default function ServicesPage() {
  const { user } = useAuth()
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Service | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const [shop, apps] = await Promise.all([
      getBarbershopById(shopId),
      getAppointmentsByBarbershop(shopId),
    ])
    setServices(shop?.services ?? [])
    setAppointments(apps)
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const shops = await getAllBarbershops()
      setBarbershops(shops)
      const shopId = user?.barbershopId ?? shops[0]?.id ?? ''
      setSelectedShop(shopId)
      await load(shopId)
    }
    init()
  }, [])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setModal('create')
  }

  const openEdit = (s: Service) => {
    setForm({ name: s.name, price: String(s.price), duration: String(s.duration), description: s.description ?? '' })
    setEditTarget(s)
    setModal('edit')
  }

  const closeModal = () => { setModal(null); setEditTarget(null) }

  const isValid = form.name.trim() && Number(form.price) > 0 && Number(form.duration) > 0

  const saveServices = async (updated: Service[]) => {
    setSaving(true)
    await updateBarbershop(selectedShop, { services: updated })
    setServices(updated)
    setSaving(false)
    closeModal()
  }

  const handleSave = async () => {
    if (!isValid) return
    const svc: Service = {
      id: editTarget?.id ?? genId(),
      name: form.name.trim(),
      price: Number(form.price),
      duration: Number(form.duration),
      description: form.description.trim() || undefined,
    }
    const updated = modal === 'edit'
      ? services.map(s => s.id === svc.id ? svc : s)
      : [...services, svc]
    await saveServices(updated)
  }

  const handleDelete = async (id: string) => {
    await saveServices(services.filter(s => s.id !== id))
    setDeleteConfirm(null)
  }

  const timesBooked = (id: string) =>
    appointments.filter(a => a.services.some(s => s.id === id)).length

  const avgPrice = services.length
    ? (services.reduce((s, v) => s + v.price, 0) / services.length).toFixed(2)
    : '0.00'

  const mostBooked = services.length
    ? services.reduce((a, b) => timesBooked(a.id) >= timesBooked(b.id) ? a : b)
    : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Servicios</h1>
          <p className={styles.sub}>{services.length} servicios · {barbershops.find(b => b.id === selectedShop)?.name}</p>
        </div>
        <div className={styles.headerActions}>
          {user?.role === 'developer' && (
            <select className={styles.shopSelect} value={selectedShop}
              onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}>
              {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button className={styles.addBtn} onClick={openCreate}>+ Nuevo servicio</button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{services.length}</span>
          <span className={styles.statLabel}>Servicios</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{avgPrice}€</span>
          <span className={styles.statLabel}>Precio medio</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {services.length ? Math.round(services.reduce((s, v) => s + v.duration, 0) / services.length) : 0} min
          </span>
          <span className={styles.statLabel}>Duración media</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue} title={mostBooked?.name}>
            {mostBooked ? mostBooked.name.split(' ')[0] : '—'}
          </span>
          <span className={styles.statLabel}>Más solicitado</span>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : services.length === 0 ? (
        <div className={styles.empty}>
          <span>✂️</span>
          <p>No hay servicios todavía</p>
          <button className={styles.addBtn} onClick={openCreate}>+ Añadir primer servicio</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {services.map(s => {
            const booked = timesBooked(s.id)
            const isDeleting = deleteConfirm === s.id
            return (
              <div key={s.id} className={`${styles.card} ${isDeleting ? styles.cardDanger : ''}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <span className={styles.serviceName}>{s.name}</span>
                    {s.description && <span className={styles.serviceDesc}>{s.description}</span>}
                  </div>
                  <div className={styles.cardActions}>
                    {!isDeleting ? (
                      <>
                        <button className={styles.editBtn} onClick={() => openEdit(s)}>Editar</button>
                        <button className={styles.deleteBtn} onClick={() => setDeleteConfirm(s.id)}>✕</button>
                      </>
                    ) : (
                      <>
                        <span className={styles.deleteWarning}>¿Eliminar?</span>
                        <button className={styles.confirmDeleteBtn} onClick={() => handleDelete(s.id)}>Sí</button>
                        <button className={styles.cancelDeleteBtn} onClick={() => setDeleteConfirm(null)}>No</button>
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.cardMeta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaIcon}>💶</span>
                    <span className={styles.metaValue}>{s.price.toFixed(2)}€</span>
                  </div>
                  <div className={styles.metaDivider} />
                  <div className={styles.metaItem}>
                    <span className={styles.metaIcon}>⏱</span>
                    <span className={styles.metaValue}>{s.duration} min</span>
                  </div>
                  <div className={styles.metaDivider} />
                  <div className={styles.metaItem}>
                    <span className={styles.metaIcon}>📅</span>
                    <span className={styles.metaValue}>{booked} citas</span>
                  </div>
                </div>

                {/* Barra de popularidad relativa */}
                {services.length > 1 && (
                  <div className={styles.popularityBar}>
                    <div
                      className={styles.popularityFill}
                      style={{
                        width: `${Math.max(4, (booked / Math.max(...services.map(sv => timesBooked(sv.id)), 1)) * 100)}%`
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modal}>
            <h2>{modal === 'create' ? 'Nuevo servicio' : 'Editar servicio'}</h2>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label>Nombre del servicio</label>
                <input
                  autoFocus
                  placeholder="Ej: Corte clásico"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && isValid && handleSave()}
                />
              </div>
              <div className={styles.field}>
                <label>Descripción (opcional)</label>
                <input
                  placeholder="Ej: Corte con maquinilla y tijera"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Precio (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="15"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label>Duración (min)</label>
                  <select
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  >
                    <option value="">Seleccionar</option>
                    {DURATION_OPTIONS.map(d => (
                      <option key={d} value={d}>{d} min{d >= 60 ? ` (${d / 60}h)` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeModal}>Cancelar</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={!isValid || saving}>
                {saving ? 'Guardando...' : modal === 'create' ? 'Crear servicio' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
