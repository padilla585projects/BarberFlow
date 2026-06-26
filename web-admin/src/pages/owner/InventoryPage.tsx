import { useEffect, useState } from 'react'
import { getAllBarbershops } from '../../services/barbershops'
import { getProductsByBarbershop, createProduct, updateProduct, deleteProduct } from '../../services/inventory'
import { useAuth } from '../../contexts/AuthContext'
import { Product, Barbershop } from '../../types'
import styles from './InventoryPage.module.css'

const CATEGORIES = ['Champú', 'Gel', 'Cera', 'Aceite', 'Crema', 'Aftershave', 'Perfume', 'Accesorios', 'Otro']

const emptyForm = { name: '', description: '', price: 0, stock: 0, category: 'Gel' }

export default function InventoryPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Todas')

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const data = await getProductsByBarbershop(shopId)
    setProducts(data)
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

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true) }
  const openEdit = (p: Product) => {
    setForm({ name: p.name, description: p.description ?? '', price: p.price, stock: p.stock, category: p.category })
    setEditingId(p.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !selectedShop) return
    setSaving(true)
    if (editingId) {
      await updateProduct(editingId, form)
    } else {
      await createProduct({ ...form, barbershopId: selectedShop })
    }
    await load(selectedShop)
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    await deleteProduct(id)
    await load(selectedShop)
  }

  const handleStockChange = async (id: string, delta: number, current: number) => {
    const newStock = Math.max(0, current + delta)
    await updateProduct(id, { stock: newStock })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p))
  }

  const filtered = products
    .filter(p => catFilter === 'Todas' || p.category === catFilter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  const lowStock = products.filter(p => p.stock <= 3)
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Inventario</h1>
          <p className={styles.sub}>{products.length} productos · {selectedShop && barbershops.find(b => b.id === selectedShop)?.name}</p>
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
          <button className={styles.addBtn} onClick={openCreate}>+ Añadir producto</button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{products.length}</span>
          <span className={styles.statLabel}>Productos</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{products.reduce((s, p) => s + p.stock, 0)}</span>
          <span className={styles.statLabel}>Unidades</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalValue.toFixed(0)}€</span>
          <span className={styles.statLabel}>Valor total</span>
        </div>
        <div className={`${styles.stat} ${lowStock.length > 0 ? styles.statWarning : ''}`}>
          <span className={styles.statValue}>{lowStock.length}</span>
          <span className={styles.statLabel}>Stock bajo ⚠️</span>
        </div>
      </div>

      {/* Alertas stock bajo */}
      {lowStock.length > 0 && (
        <div className={styles.alert}>
          <span>⚠️</span>
          <span>Stock bajo en: {lowStock.map(p => `${p.name} (${p.stock})`).join(' · ')}</span>
        </div>
      )}

      {/* Filtros */}
      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className={styles.cats}>
          {['Todas', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              className={`${styles.catBtn} ${catFilter === cat ? styles.catActive : ''}`}
              onClick={() => setCatFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>📦</span>
          <p>No hay productos{search ? ` para "${search}"` : ''}</p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Producto</span>
            <span>Categoría</span>
            <span>Precio</span>
            <span>Stock</span>
            <span>Valor</span>
            <span>Acciones</span>
          </div>
          {filtered.map(p => (
            <div key={p.id} className={`${styles.row} ${p.stock <= 3 ? styles.rowLow : ''}`}>
              <div className={styles.productCell}>
                <span className={styles.productName}>{p.name}</span>
                {p.description && <span className={styles.productDesc}>{p.description}</span>}
              </div>
              <span className={styles.category}>{p.category}</span>
              <span className={styles.price}>{p.price.toFixed(2)}€</span>
              <div className={styles.stockCell}>
                <button className={styles.stockBtn} onClick={() => handleStockChange(p.id, -1, p.stock)}>−</button>
                <span className={`${styles.stockNum} ${p.stock <= 3 ? styles.stockLow : ''}`}>{p.stock}</span>
                <button className={styles.stockBtn} onClick={() => handleStockChange(p.id, +1, p.stock)}>+</button>
              </div>
              <span className={styles.price}>{(p.price * p.stock).toFixed(2)}€</span>
              <div className={styles.rowActions}>
                <button className={styles.editBtn} onClick={() => openEdit(p)}>Editar</button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(p.id, p.name)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>

            <div className={styles.modalFields}>
              <div className={styles.field}>
                <label>Nombre *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Gel fijador fuerte" />
              </div>
              <div className={styles.field}>
                <label>Descripción</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Opcional" />
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Precio (€) *</label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: +e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Stock inicial</label>
                  <input type="number" min="0" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: +e.target.value }))} />
                </div>
              </div>
              <div className={styles.field}>
                <label>Categoría</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Añadir producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
