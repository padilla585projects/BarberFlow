import { useEffect, useState } from 'react'
import { getAllBarbershops } from '../../services/barbershops'
import { getUsersByBarbershop, getUserByEmail, addBarberToShop, removeBarberFromShop, updateBarberSettings } from '../../services/users'
import { getAppointmentsByBarbershop } from '../../services/appointments'
import { useAuth } from '../../contexts/AuthContext'
import { Barbershop, User, Appointment } from '../../types'
import styles from './BarbersPage.module.css'

const slotLabel = (n: number) => `${Math.round(60 / n)} min/cita`

type SearchState = 'idle' | 'searching' | 'found' | 'not-found' | 'already-here' | 'error'

export default function BarbersPage() {
  const { user } = useAuth()
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [barbers, setBarbers] = useState<User[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [capacity, setCapacity] = useState<Record<string, number>>({})
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  // Modal añadir barbero
  const [addModal, setAddModal] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [foundUser, setFoundUser] = useState<User | null>(null)
  const [adding, setAdding] = useState(false)

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const [users, apps] = await Promise.all([
      getUsersByBarbershop(shopId),
      getAppointmentsByBarbershop(shopId),
    ])
    const bs = users.filter(u => u.role === 'barber' || u.role === 'owner')
    setBarbers(bs)
    setAppointments(apps)
    const caps: Record<string, number> = {}
    bs.forEach(b => { caps[b.uid] = b.appointmentsPerHour ?? 1 })
    setCapacity(caps)
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

  // ── Capacidad ──────────────────────────────────────────
  const handleCapacity = (uid: string, val: number) =>
    setCapacity(prev => ({ ...prev, [uid]: Math.min(4, Math.max(1, val)) }))

  const saveCapacity = async (uid: string) => {
    setSaving(uid)
    await updateBarberSettings(uid, { appointmentsPerHour: capacity[uid] })
    setBarbers(prev => prev.map(b => b.uid === uid ? { ...b, appointmentsPerHour: capacity[uid] } : b))
    setSaving(null)
  }

  // ── Quitar barbero ─────────────────────────────────────
  const handleRemove = async (uid: string) => {
    setRemoving(uid)
    await removeBarberFromShop(uid)
    setBarbers(prev => prev.filter(b => b.uid !== uid))
    setRemoveConfirm(null)
    setRemoving(null)
  }

  // ── Buscar por email ───────────────────────────────────
  const handleSearch = async () => {
    if (!searchEmail.trim()) return
    setSearchState('searching')
    setFoundUser(null)
    try {
      const found = await getUserByEmail(searchEmail)
      if (!found) { setSearchState('not-found'); return }
      if (barbers.some(b => b.uid === found.uid)) { setSearchState('already-here'); setFoundUser(found); return }
      setFoundUser(found)
      setSearchState('found')
    } catch {
      setSearchState('error')
    }
  }

  const handleAdd = async () => {
    if (!foundUser) return
    setAdding(true)
    await addBarberToShop(foundUser.uid, selectedShop)
    const newBarber: User = { ...foundUser, role: 'barber', barbershopId: selectedShop }
    setBarbers(prev => [...prev, newBarber])
    setCapacity(prev => ({ ...prev, [foundUser.uid]: 1 }))
    setAddModal(false)
    setSearchEmail('')
    setSearchState('idle')
    setFoundUser(null)
    setAdding(false)
  }

  const closeAddModal = () => {
    setAddModal(false)
    setSearchEmail('')
    setSearchState('idle')
    setFoundUser(null)
  }

  // ── Stats ──────────────────────────────────────────────
  const getBarberStats = (uid: string) => {
    const ba = appointments.filter(a => a.barberId === uid)
    const completed = ba.filter(a => a.status === 'completed')
    return {
      today: ba.filter(a => new Date(a.date).toDateString() === new Date().toDateString()).length,
      total: ba.length,
      ingresos: completed.reduce((s, a) => s + a.totalPrice, 0),
    }
  }

  const isDirty = (b: User) => capacity[b.uid] !== (b.appointmentsPerHour ?? 1)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Barberos</h1>
          <p className={styles.sub}>
            {barbers.length} barbero{barbers.length !== 1 ? 's' : ''} · {barbershops.find(b => b.id === selectedShop)?.name}
          </p>
        </div>
        <div className={styles.headerActions}>
          {user?.role === 'developer' && (
            <select className={styles.shopSelect} value={selectedShop}
              onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}>
              {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button className={styles.addBtn} onClick={() => setAddModal(true)}>
            + Añadir barbero
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className={styles.infoBanner}>
        <span className={styles.infoIcon}>💡</span>
        <p>
          La <strong>capacidad por hora</strong> determina cada cuántos minutos se genera un hueco de reserva.
          Con <strong>2 citas/hora</strong> → slots cada <strong>30 min</strong>;
          con <strong>1 cita/hora</strong> → slots cada <strong>60 min</strong>.
        </p>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : barbers.length === 0 ? (
        <div className={styles.empty}>
          <span>✂️</span>
          <p>No hay barberos en esta barbería</p>
          <button className={styles.addBtn} onClick={() => setAddModal(true)}>+ Añadir primer barbero</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {barbers.map(b => {
            const stats = getBarberStats(b.uid)
            const cap = capacity[b.uid] ?? 1
            const isSaving = saving === b.uid
            const isRemoving = removing === b.uid
            const confirmingRemove = removeConfirm === b.uid
            const canRemove = b.role !== 'owner'

            return (
              <div key={b.uid} className={styles.card}>
                {/* Avatar + info + acciones */}
                <div className={styles.cardTop}>
                  {b.photoURL
                    ? <img src={b.photoURL} alt={b.displayName} className={styles.avatar} />
                    : <div className={styles.avatarFallback}>{b.displayName?.[0]?.toUpperCase()}</div>
                  }
                  <div className={styles.info}>
                    <p className={styles.name}>{b.displayName}</p>
                    <p className={styles.email}>{b.email}</p>
                    <span className={`${styles.roleBadge} ${b.role === 'owner' ? styles.ownerBadge : ''}`}>
                      {b.role === 'owner' ? 'Dueño' : 'Barbero'}
                    </span>
                  </div>
                  {canRemove && (
                    <div className={styles.removeArea}>
                      {!confirmingRemove ? (
                        <button className={styles.removeBtn} onClick={() => setRemoveConfirm(b.uid)} title="Quitar de la barbería">✕</button>
                      ) : (
                        <div className={styles.removeConfirm}>
                          <span>¿Quitar?</span>
                          <button className={styles.confirmYes} onClick={() => handleRemove(b.uid)} disabled={isRemoving}>
                            {isRemoving ? '...' : 'Sí'}
                          </button>
                          <button className={styles.confirmNo} onClick={() => setRemoveConfirm(null)}>No</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mini stats */}
                <div className={styles.miniStats}>
                  <div className={styles.miniStat}>
                    <span className={styles.miniVal}>{stats.today}</span>
                    <span className={styles.miniLabel}>Hoy</span>
                  </div>
                  <div className={styles.miniStat}>
                    <span className={styles.miniVal}>{stats.total}</span>
                    <span className={styles.miniLabel}>Total citas</span>
                  </div>
                  <div className={styles.miniStat}>
                    <span className={styles.miniVal}>{stats.ingresos.toFixed(0)}€</span>
                    <span className={styles.miniLabel}>Ingresos</span>
                  </div>
                </div>

                {/* Capacidad */}
                <div className={styles.capacitySection}>
                  <div className={styles.capacityHeader}>
                    <span className={styles.capacityLabel}>Citas por hora</span>
                    <span className={styles.slotLabelBadge}>{slotLabel(cap)}</span>
                  </div>
                  <div className={styles.capacityControl}>
                    <button className={styles.capBtn} onClick={() => handleCapacity(b.uid, cap - 1)} disabled={cap <= 1}>−</button>
                    <div className={styles.capDisplay}>
                      {[1, 2, 3, 4].map(n => (
                        <button key={n}
                          className={`${styles.capOption} ${cap === n ? styles.capActive : ''}`}
                          onClick={() => handleCapacity(b.uid, n)}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <button className={styles.capBtn} onClick={() => handleCapacity(b.uid, cap + 1)} disabled={cap >= 4}>+</button>
                  </div>
                  <div className={styles.slotsPreview}>
                    {Array.from({ length: cap }, (_, i) => {
                      const mins = Math.round((i * 60) / cap)
                      const h = String(Math.floor(mins / 60) + 9).padStart(2, '0')
                      const m = String(mins % 60).padStart(2, '0')
                      return <span key={i} className={styles.slotChip}>{h}:{m}</span>
                    })}
                    <span className={styles.slotDots}>· · ·</span>
                    <span className={styles.slotsNote}>huecos/hora</span>
                  </div>
                </div>

                {isDirty(b) && (
                  <button className={styles.saveBtn} onClick={() => saveCapacity(b.uid)} disabled={isSaving}>
                    {isSaving ? 'Guardando...' : '✓ Guardar cambios'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal añadir barbero ── */}
      {addModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && closeAddModal()}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Añadir barbero</h2>
              <button className={styles.closeBtn} onClick={closeAddModal}>✕</button>
            </div>

            <p className={styles.modalDesc}>
              El barbero debe tener cuenta en BarberFlow. Introduce su email para buscarlo.
            </p>

            <div className={styles.searchRow}>
              <input
                type="email"
                className={styles.searchInput}
                placeholder="email@ejemplo.com"
                value={searchEmail}
                onChange={e => { setSearchEmail(e.target.value); setSearchState('idle'); setFoundUser(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                autoFocus
              />
              <button
                className={styles.searchBtn}
                onClick={handleSearch}
                disabled={searchState === 'searching' || !searchEmail.trim()}
              >
                {searchState === 'searching' ? '...' : 'Buscar'}
              </button>
            </div>

            {/* Resultados de búsqueda */}
            {searchState === 'not-found' && (
              <div className={styles.searchResult + ' ' + styles.resultError}>
                <span>❌</span>
                <div>
                  <p>No existe ningún usuario con ese email.</p>
                  <small>Pídele que se registre primero en la app de BarberFlow.</small>
                </div>
              </div>
            )}

            {searchState === 'error' && (
              <div className={styles.searchResult + ' ' + styles.resultError}>
                <span>⚠️</span>
                <p>Error al buscar. Inténtalo de nuevo.</p>
              </div>
            )}

            {searchState === 'already-here' && foundUser && (
              <div className={styles.searchResult + ' ' + styles.resultWarn}>
                <span>ℹ️</span>
                <p><strong>{foundUser.displayName}</strong> ya es barbero en esta barbería.</p>
              </div>
            )}

            {searchState === 'found' && foundUser && (
              <div className={styles.foundCard}>
                {foundUser.photoURL
                  ? <img src={foundUser.photoURL} className={styles.foundAvatar} alt="" />
                  : <div className={styles.foundAvatarFallback}>{foundUser.displayName[0]}</div>
                }
                <div className={styles.foundInfo}>
                  <p className={styles.foundName}>{foundUser.displayName}</p>
                  <p className={styles.foundEmail}>{foundUser.email}</p>
                  {foundUser.barbershopId && foundUser.barbershopId !== selectedShop && (
                    <span className={styles.foundWarn}>⚠️ Ya asignado a otra barbería</span>
                  )}
                </div>
                <button className={styles.addConfirmBtn} onClick={handleAdd} disabled={adding}>
                  {adding ? 'Añadiendo...' : '+ Añadir'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
