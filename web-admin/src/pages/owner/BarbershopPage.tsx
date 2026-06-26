import { useEffect, useState } from 'react'
import { getAllBarbershops, getBarbershopById, updateBarbershop } from '../../services/barbershops'
import { useAuth } from '../../contexts/AuthContext'
import { Barbershop, OpeningHours, DayHours } from '../../types'
import styles from './BarbershopPage.module.css'

const DAYS: { key: keyof OpeningHours; label: string }[] = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',   label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves' },
  { key: 'friday',    label: 'Viernes' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
]

const DEFAULT_HOURS: OpeningHours = {
  monday:    { open: true,  from: '09:00', to: '20:00' },
  tuesday:   { open: true,  from: '09:00', to: '20:00' },
  wednesday: { open: true,  from: '09:00', to: '20:00' },
  thursday:  { open: true,  from: '09:00', to: '20:00' },
  friday:    { open: true,  from: '09:00', to: '20:00' },
  saturday:  { open: true,  from: '10:00', to: '18:00' },
  sunday:    { open: false, from: '10:00', to: '14:00' },
}

type FormData = {
  name: string
  address: string
  phone: string
  photoURL: string
  openingHours: OpeningHours
}

export default function BarbershopPage() {
  const { user } = useAuth()
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [form, setForm] = useState<FormData | null>(null)
  const [original, setOriginal] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const shop = await getBarbershopById(shopId)
    if (shop) {
      const f: FormData = {
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        photoURL: shop.photoURL ?? '',
        openingHours: shop.openingHours ?? DEFAULT_HOURS,
      }
      setForm(f)
      setOriginal(f)
    }
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

  const setField = (key: keyof Omit<FormData, 'openingHours'>, val: string) =>
    setForm(f => f ? { ...f, [key]: val } : f)

  const setDayHours = (day: keyof OpeningHours, patch: Partial<DayHours>) =>
    setForm(f => f ? {
      ...f,
      openingHours: {
        ...f.openingHours,
        [day]: { ...f.openingHours[day], ...patch }
      }
    } : f)

  const isDirty = JSON.stringify(form) !== JSON.stringify(original)

  const handleSave = async () => {
    if (!form || !selectedShop) return
    setSaving(true)
    await updateBarbershop(selectedShop, {
      name: form.name,
      address: form.address,
      phone: form.phone,
      photoURL: form.photoURL || undefined,
      openingHours: form.openingHours,
    })
    setOriginal(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => setForm(original)

  // Cuántas horas abre cada día
  const hoursOpen = (day: DayHours) => {
    if (!day.open) return 0
    const [fh, fm] = day.from.split(':').map(Number)
    const [th, tm] = day.to.split(':').map(Number)
    return ((th * 60 + tm) - (fh * 60 + fm)) / 60
  }

  const totalWeekHours = form
    ? DAYS.reduce((s, d) => s + hoursOpen(form.openingHours[d.key]), 0)
    : 0

  const openDays = form ? DAYS.filter(d => form.openingHours[d.key].open).length : 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Mi Barbería</h1>
          <p className={styles.sub}>{barbershops.find(b => b.id === selectedShop)?.name ?? '—'}</p>
        </div>
        <div className={styles.headerActions}>
          {user?.role === 'developer' && (
            <select className={styles.shopSelect} value={selectedShop}
              onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}>
              {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          {isDirty && (
            <button className={styles.resetBtn} onClick={handleReset}>Descartar</button>
          )}
          <button
            className={`${styles.saveBtn} ${saved ? styles.savedBtn : ''}`}
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {loading || !form ? (
        <div className={styles.loading}>Cargando...</div>
      ) : (
        <div className={styles.layout}>
          {/* Columna izquierda: info */}
          <div className={styles.col}>
            {/* Información básica */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Información general</h2>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label>Nombre de la barbería</label>
                  <input
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    placeholder="BarberFlow Madrid"
                  />
                </div>
                <div className={styles.field}>
                  <label>Dirección</label>
                  <input
                    value={form.address}
                    onChange={e => setField('address', e.target.value)}
                    placeholder="Calle Mayor 1, Madrid"
                  />
                </div>
                <div className={styles.field}>
                  <label>Teléfono</label>
                  <input
                    value={form.phone}
                    onChange={e => setField('phone', e.target.value)}
                    placeholder="+34 600 000 000"
                  />
                </div>
                <div className={styles.field}>
                  <label>URL foto de portada</label>
                  <input
                    value={form.photoURL}
                    onChange={e => setField('photoURL', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
              {form.photoURL && (
                <div className={styles.photoPreview}>
                  <img src={form.photoURL} alt="preview" onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </section>

            {/* Resumen semana */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Resumen semanal</h2>
              <div className={styles.weekStats}>
                <div className={styles.weekStat}>
                  <span className={styles.weekVal}>{openDays}</span>
                  <span className={styles.weekLabel}>Días abierto</span>
                </div>
                <div className={styles.weekStat}>
                  <span className={styles.weekVal}>{totalWeekHours.toFixed(0)}h</span>
                  <span className={styles.weekLabel}>Horas/semana</span>
                </div>
                <div className={styles.weekStat}>
                  <span className={styles.weekVal}>{7 - openDays}</span>
                  <span className={styles.weekLabel}>Días cerrado</span>
                </div>
              </div>
            </section>
          </div>

          {/* Columna derecha: horarios */}
          <div className={styles.col}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Horarios de apertura</h2>
              <div className={styles.schedule}>
                {DAYS.map(({ key, label }) => {
                  const day = form.openingHours[key]
                  return (
                    <div key={key} className={`${styles.dayRow} ${!day.open ? styles.dayRowClosed : ''}`}>
                      <button
                        className={`${styles.dayToggle} ${day.open ? styles.dayOpen : styles.dayClosed}`}
                        onClick={() => setDayHours(key, { open: !day.open })}
                      >
                        <span className={styles.dayDot} />
                        <span className={styles.dayName}>{label}</span>
                      </button>

                      {day.open ? (
                        <div className={styles.timeRange}>
                          <input
                            type="time"
                            className={styles.timeInput}
                            value={day.from}
                            onChange={e => setDayHours(key, { from: e.target.value })}
                          />
                          <span className={styles.timeSep}>—</span>
                          <input
                            type="time"
                            className={styles.timeInput}
                            value={day.to}
                            onChange={e => setDayHours(key, { to: e.target.value })}
                          />
                          <span className={styles.dayHours}>{hoursOpen(day).toFixed(1)}h</span>
                        </div>
                      ) : (
                        <span className={styles.closedLabel}>Cerrado</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
