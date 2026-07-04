import { useEffect, useState } from 'react'
import { getPromosByBarbershop, createPromo, updatePromo, deletePromo } from '../../services/promos'
import { getAllBarbershops } from '../../services/barbershops'
import { useAuth } from '../../contexts/AuthContext'
import { Promo, Barbershop } from '../../types'
import styles from './PromosPage.module.css'

type PromoType = 'percentage' | 'fixed'

const emptyForm = {
  code: '',
  description: '',
  type: 'percentage' as PromoType,
  value: 10,
  maxUses: 100,
  active: true,
  expiresAt: '',
}

export default function PromosPage() {
  const { user } = useAuth()
  const [promos, setPromos]           = useState<Promo[]>([])
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [form, setForm]               = useState<typeof emptyForm>(emptyForm)
  const [saving, setSaving]           = useState(false)

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const data = await getPromosByBarbershop(shopId)
    setPromos(data)
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const allShops = await getAllBarbershops()
      const shops = user?.role === 'developer'
        ? allShops
        : allShops.filter(s => s.ownerId === user?.uid)
      setBarbershops(shops)
      const shopId = user?.barbershopId ?? shops[0]?.id ?? ''
      setSelectedShop(shopId)
      await load(shopId)
    }
    init()
  }, [])

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true) }
  const openEdit = (p: Promo) => {
    setForm({
      code: p.code,
      description: p.description,
      type: p.type,
      value: p.value,
      maxUses: p.maxUses,
      active: p.active,
      expiresAt: p.expiresAt ? p.expiresAt.toISOString().split('T')[0] : '',
    })
    setEditingId(p.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.code.trim() || !selectedShop) return
    setSaving(true)
    const { expiresAt: _expiresAt, ...formRest } = form
    const data = {
      ...formRest,
      code: form.code.toUpperCase().trim(),
      barbershopId: selectedShop,
      ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt) } : {}),
    }
    if (editingId) {
      await updatePromo(editingId, data)
      setPromos(prev => prev.map(p => p.id === editingId ? { ...p, ...data } : p))
    } else {
      await createPromo(data)
      await load(selectedShop)
    }
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`¿Eliminar el código "${code}"?`)) return
    await deletePromo(id)
    setPromos(prev => prev.filter(p => p.id !== id))
  }

  const handleToggle = async (p: Promo) => {
    await updatePromo(p.id, { active: !p.active })
    setPromos(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x))
  }

  const active   = promos.filter(p => p.active)
  const inactive = promos.filter(p => !p.active)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Códigos Promo</h1>
          <p className={styles.sub}>{promos.length} códigos · {active.length} activos</p>
        </div>
        <div className={styles.headerActions}>
          {user?.role === 'developer' && (
            <select
              className={styles.shopSelect}
              value={selectedShop}
              onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}
            >
              {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button className={styles.addBtn} onClick={openCreate}>+ Nuevo código</button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : promos.length === 0 ? (
        <div className={styles.empty}>
          <span>🎟️</span>
          <p>No hay códigos promocionales</p>
          <button className={styles.addBtn} onClick={openCreate}>Crear el primero</button>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Código</span>
            <span>Descripción</span>
            <span>Descuento</span>
            <span>Usos</span>
            <span>Expira</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {[...active, ...inactive].map(p => (
            <div key={p.id} className={`${styles.row} ${!p.active ? styles.rowInactive : ''}`}>
              <span className={styles.code}>{p.code}</span>
              <span className={styles.desc}>{p.description}</span>
              <span className={styles.value}>
                {p.type === 'percentage' ? `${p.value}%` : `${p.value}€`}
              </span>
              <span className={styles.uses}>{p.currentUses} / {p.maxUses}</span>
              <span className={styles.expires}>
                {p.expiresAt
                  ? (p.expiresAt instanceof Date ? p.expiresAt : new Date((p.expiresAt as any).seconds * 1000))
                      .toLocaleDateString('es-ES')
                  : '—'}
              </span>
              <button
                className={`${styles.toggleBtn} ${p.active ? styles.toggleActive : styles.toggleOff}`}
                onClick={() => handleToggle(p)}
              >
                {p.active ? 'Activo' : 'Inactivo'}
              </button>
              <div className={styles.actions}>
                <button className={styles.editBtn} onClick={() => openEdit(p)}>Editar</button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(p.id, p.code)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{editingId ? 'Editar código' : 'Nuevo código promo'}</h2>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label>Código *</label>
                <input
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="Ej: VERANO25"
                />
              </div>
              <div className={styles.field}>
                <label>Descripción *</label>
                <input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ej: 25% descuento en verano"
                />
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Tipo</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}>
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Fijo (€)</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Valor *</label>
                  <input
                    type="number"
                    min="0"
                    step={form.type === 'percentage' ? '1' : '0.50'}
                    value={form.value}
                    onChange={e => setForm(p => ({ ...p, value: +e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Usos máximos</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxUses}
                    onChange={e => setForm(p => ({ ...p, maxUses: +e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label>Fecha expiración</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                  />
                </div>
              </div>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                />
                Activar código inmediatamente
              </label>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !form.code.trim()}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear código'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
