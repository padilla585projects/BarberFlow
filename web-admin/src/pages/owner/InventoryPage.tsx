import { useEffect, useState, useRef } from 'react'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../../services/firebase'
import { getAllBarbershops } from '../../services/barbershops'
import { getProductsByBarbershop, createProduct, updateProduct, deleteProduct } from '../../services/inventory'
import { useAuth } from '../../contexts/AuthContext'
import { Product, Barbershop } from '../../types'
import styles from './InventoryPage.module.css'

const CATEGORIES = ['Champú', 'Gel', 'Cera', 'Aceite', 'Crema', 'Aftershave', 'Perfume', 'Accesorios', 'Otro']

const CATEGORY_ICONS: Record<string, string> = {
  'Champú': '🧴', 'Gel': '💈', 'Cera': '🫙', 'Aceite': '💧',
  'Crema': '🧴', 'Aftershave': '✨', 'Perfume': '🌸', 'Accesorios': '✂️', 'Otro': '📦',
}

const emptyForm = { name: '', description: '', price: 0, stock: 0, category: 'Gel', photoURL: '' }

const WIZARD_STEPS = [
  { num: 1, label: 'Información', icon: '📝' },
  { num: 2, label: 'Imagen y precio', icon: '🖼️' },
  { num: 3, label: 'Revisar y crear', icon: '✅' },
]

type ViewMode = 'grid' | 'table' | 'catalog'
type SortKey = 'name' | 'price' | 'stock' | 'value' | 'category'

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
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [wizardStep, setWizardStep] = useState(1)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File) => {
    if (!selectedShop) return
    setUploading(true)
    setUploadProgress(0)
    const timestamp = Date.now()
    const path = `products/${selectedShop}/${editingId || timestamp}.jpg`
    const fileRef = storageRef(storage, path)
    const uploadTask = uploadBytesResumable(fileRef, file)

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        setUploadProgress(progress)
      },
      (error) => {
        console.error('Upload error:', error)
        setUploading(false)
        setUploadProgress(null)
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref)
        setForm(p => ({ ...p, photoURL: url }))
        setUploading(false)
        setUploadProgress(null)
      }
    )
  }

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

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setWizardStep(1); setShowForm(true) }
  const openEdit = (p: Product) => {
    setForm({ name: p.name, description: p.description ?? '', price: p.price, stock: p.stock, category: p.category, photoURL: p.photoURL ?? '' })
    setEditingId(p.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !selectedShop) return
    setSaving(true)
    const data = { ...form, photoURL: form.photoURL || undefined }
    if (editingId) {
      await updateProduct(editingId, data)
    } else {
      await createProduct({ ...data, barbershopId: selectedShop } as any)
    }
    await load(selectedShop)
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    await deleteProduct(id)
    await load(selectedShop)
  }

  const handleStockChange = async (id: string, delta: number, current: number) => {
    const newStock = Math.max(0, current + delta)
    await updateProduct(id, { stock: newStock })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p))
  }

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc)
    else { setSortBy(key); setSortAsc(true) }
  }

  const filtered = products
    .filter(p => catFilter === 'Todas' || p.category === catFilter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.description ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'price': cmp = a.price - b.price; break
        case 'stock': cmp = a.stock - b.stock; break
        case 'value': cmp = (a.price * a.stock) - (b.price * b.stock); break
        case 'category': cmp = a.category.localeCompare(b.category); break
      }
      return sortAsc ? cmp : -cmp
    })

  const lowStock = products.filter(p => p.stock <= 3)
  const outOfStock = products.filter(p => p.stock === 0)
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)
  const totalUnits = products.reduce((s, p) => s + p.stock, 0)

  const getStockLevel = (stock: number) => {
    if (stock === 0) return 'out'
    if (stock <= 3) return 'low'
    if (stock <= 10) return 'medium'
    return 'good'
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Inventario</h1>
          <p className={styles.sub}>{products.length} productos · {selectedShop && barbershops.find(b => b.id === selectedShop)?.name}</p>
        </div>
        <div className={styles.headerActions}>
          {user?.role === 'developer' && (
            <select className={styles.shopSelect} value={selectedShop}
              onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}>
              {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button className={styles.addBtn} onClick={openCreate}>+ Añadir producto</button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statIcon}>📦</div>
          <div>
            <span className={styles.statValue}>{products.length}</span>
            <span className={styles.statLabel}>Productos</span>
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statIcon}>🏷️</div>
          <div>
            <span className={styles.statValue}>{totalUnits}</span>
            <span className={styles.statLabel}>Unidades</span>
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statIcon}>💰</div>
          <div>
            <span className={styles.statValue}>{totalValue.toFixed(0)}€</span>
            <span className={styles.statLabel}>Valor total</span>
          </div>
        </div>
        <div className={`${styles.stat} ${lowStock.length > 0 ? styles.statWarning : ''}`}>
          <div className={styles.statIcon}>{outOfStock.length > 0 ? '🔴' : lowStock.length > 0 ? '🟡' : '🟢'}</div>
          <div>
            <span className={styles.statValue}>{lowStock.length}</span>
            <span className={styles.statLabel}>{outOfStock.length > 0 ? `${outOfStock.length} sin stock` : 'Stock bajo'}</span>
          </div>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className={styles.alert}>
          <div className={styles.alertHeader}>
            <span>⚠️ Productos con stock bajo</span>
            <span className={styles.alertCount}>{lowStock.length}</span>
          </div>
          <div className={styles.alertItems}>
            {lowStock.map(p => (
              <div key={p.id} className={styles.alertItem}>
                <span>{p.name}</span>
                <span className={`${styles.alertStock} ${p.stock === 0 ? styles.alertOut : ''}`}>
                  {p.stock === 0 ? 'Agotado' : `${p.stock} uds`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.search}
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>}
        </div>
        <div className={styles.toolbarRight}>
          <select className={styles.sortSelect} value={`${sortBy}-${sortAsc ? 'asc' : 'desc'}`}
            onChange={e => {
              const [k, d] = e.target.value.split('-')
              setSortBy(k as SortKey)
              setSortAsc(d === 'asc')
            }}>
            <option value="name-asc">Nombre A-Z</option>
            <option value="name-desc">Nombre Z-A</option>
            <option value="price-asc">Precio ↑</option>
            <option value="price-desc">Precio ↓</option>
            <option value="stock-asc">Stock ↑</option>
            <option value="stock-desc">Stock ↓</option>
            <option value="value-desc">Mayor valor</option>
            <option value="category-asc">Categoría</option>
          </select>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewActive : ''}`}
              onClick={() => setViewMode('grid')} title="Vista cuadrícula">▦</button>
            <button className={`${styles.viewBtn} ${viewMode === 'catalog' ? styles.viewActive : ''}`}
              onClick={() => setViewMode('catalog')} title="Vista catálogo">◫</button>
            <button className={`${styles.viewBtn} ${viewMode === 'table' ? styles.viewActive : ''}`}
              onClick={() => setViewMode('table')} title="Vista tabla">☰</button>
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className={styles.cats}>
        {['Todas', ...CATEGORIES].map(cat => (
          <button key={cat}
            className={`${styles.catBtn} ${catFilter === cat ? styles.catActive : ''}`}
            onClick={() => setCatFilter(cat)}>
            {cat !== 'Todas' && <span className={styles.catIcon}>{CATEGORY_ICONS[cat]}</span>}
            {cat}
            {cat !== 'Todas' && (
              <span className={styles.catCount}>{products.filter(p => p.category === cat).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Cargando inventario...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>📦</span>
          <p>No hay productos{search ? ` para "${search}"` : catFilter !== 'Todas' ? ` en "${catFilter}"` : ''}</p>
          {products.length === 0 && (
            <button className={styles.emptyBtn} onClick={openCreate}>Añadir primer producto</button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid view */
        <div className={styles.grid}>
          {filtered.map(p => (
            <div key={p.id} className={`${styles.card} ${p.stock === 0 ? styles.cardOut : p.stock <= 3 ? styles.cardLow : ''}`}>
              <div className={styles.cardTop}>
                {p.photoURL ? (
                  <>
                    <img src={p.photoURL} alt={p.name} className={styles.cardImg} />
                    <div className={styles.cardImgOverlay} />
                  </>
                ) : (
                  <div className={styles.cardImgPlaceholder}>
                    <span>{CATEGORY_ICONS[p.category] ?? '📦'}</span>
                  </div>
                )}
                <div className={`${styles.stockBadge} ${styles[`stock_${getStockLevel(p.stock)}`]}`}>
                  {p.stock === 0 ? 'Agotado' : `${p.stock} uds`}
                </div>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardCategory}>{p.category}</span>
                <h3 className={styles.cardName}>{p.name}</h3>
                {p.description && <p className={styles.cardDesc}>{p.description}</p>}
                <div className={styles.cardFooter}>
                  <span className={styles.cardPrice}>{p.price.toFixed(2)}€</span>
                  <span className={styles.cardValue}>Valor: {(p.price * p.stock).toFixed(0)}€</span>
                </div>
                <div className={styles.cardStock}>
                  <button className={styles.stockBtn} onClick={() => handleStockChange(p.id, -1, p.stock)} disabled={p.stock === 0}>−</button>
                  <div className={styles.stockBar}>
                    <div className={styles.stockBarFill} style={{
                      width: `${Math.min(100, (p.stock / 30) * 100)}%`,
                      background: p.stock === 0 ? 'var(--error)' : p.stock <= 3 ? 'var(--warning)' : p.stock <= 10 ? '#60a5fa' : 'var(--success)',
                    }} />
                  </div>
                  <button className={styles.stockBtn} onClick={() => handleStockChange(p.id, +1, p.stock)}>+</button>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.editBtn} onClick={() => openEdit(p)}>Editar</button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(p.id, p.name)}>Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'catalog' ? (
        /* Catalog view - premium e-commerce */
        <div className={styles.catalogGrid}>
          {filtered.map(p => (
            <div key={p.id} className={styles.catalogCard}>
              <div className={styles.catalogPhoto}>
                {p.photoURL ? (
                  <img src={p.photoURL} alt={p.name} className={styles.catalogImg} />
                ) : (
                  <div className={styles.catalogImgPlaceholder}>
                    <span>{CATEGORY_ICONS[p.category] ?? '📦'}</span>
                  </div>
                )}
                <div className={styles.catalogOverlay} />
                <span className={styles.catalogCategoryBadge}>{p.category}</span>
                <div className={`${styles.catalogStockBadge} ${styles[`stock_${getStockLevel(p.stock)}`]}`}>
                  {p.stock === 0 ? 'Agotado' : `${p.stock} uds`}
                </div>
                <h3 className={styles.catalogNameOverlay}>{p.name}</h3>
              </div>
              <div className={styles.catalogBody}>
                <div className={styles.catalogPriceRow}>
                  <span className={styles.catalogPrice}>{p.price.toFixed(2)}€</span>
                  <span className={styles.catalogValue}>Valor: {(p.price * p.stock).toFixed(0)}€</span>
                </div>
                {p.description && <p className={styles.catalogDesc}>{p.description}</p>}
                <div className={styles.catalogStockBar}>
                  <div className={styles.catalogStockBarTrack}>
                    <div className={styles.catalogStockBarFill} style={{
                      width: `${Math.min(100, (p.stock / 30) * 100)}%`,
                      background: p.stock === 0 ? 'var(--error)' : p.stock <= 3 ? 'var(--warning)' : p.stock <= 10 ? '#60a5fa' : 'var(--success)',
                    }} />
                  </div>
                  <span className={styles.catalogStockText}>{p.stock} uds</span>
                </div>
                <div className={styles.catalogActions}>
                  <div className={styles.catalogStockBtns}>
                    <button className={styles.catalogStockBtn} onClick={() => handleStockChange(p.id, -1, p.stock)} disabled={p.stock === 0}>−</button>
                    <button className={styles.catalogStockBtn} onClick={() => handleStockChange(p.id, +1, p.stock)}>+</button>
                  </div>
                  <button className={styles.catalogEditBtn} onClick={() => openEdit(p)}>Editar</button>
                  <button className={styles.catalogDeleteBtn} onClick={() => handleDelete(p.id, p.name)}>Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table view */
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span className={styles.sortable} onClick={() => handleSort('name')}>
              Producto {sortBy === 'name' ? (sortAsc ? '↑' : '↓') : ''}
            </span>
            <span className={styles.sortable} onClick={() => handleSort('category')}>
              Categoría {sortBy === 'category' ? (sortAsc ? '↑' : '↓') : ''}
            </span>
            <span className={styles.sortable} onClick={() => handleSort('price')}>
              Precio {sortBy === 'price' ? (sortAsc ? '↑' : '↓') : ''}
            </span>
            <span className={styles.sortable} onClick={() => handleSort('stock')}>
              Stock {sortBy === 'stock' ? (sortAsc ? '↑' : '↓') : ''}
            </span>
            <span className={styles.sortable} onClick={() => handleSort('value')}>
              Valor {sortBy === 'value' ? (sortAsc ? '↑' : '↓') : ''}
            </span>
            <span>Acciones</span>
          </div>
          {filtered.map(p => (
            <div key={p.id} className={`${styles.row} ${p.stock === 0 ? styles.rowOut : p.stock <= 3 ? styles.rowLow : ''}`}>
              <div className={styles.productCell}>
                {p.photoURL ? (
                  <img src={p.photoURL} alt={p.name} className={styles.rowImg} />
                ) : (
                  <div className={styles.rowImgPlaceholder}>{CATEGORY_ICONS[p.category] ?? '📦'}</div>
                )}
                <div>
                  <span className={styles.productName}>{p.name}</span>
                  {p.description && <span className={styles.productDesc}>{p.description}</span>}
                </div>
              </div>
              <span className={styles.categoryBadge}>{p.category}</span>
              <span className={styles.price}>{p.price.toFixed(2)}€</span>
              <div className={styles.stockCell}>
                <button className={styles.stockBtnSm} onClick={() => handleStockChange(p.id, -1, p.stock)} disabled={p.stock === 0}>−</button>
                <span className={`${styles.stockNum} ${styles[`stockNum_${getStockLevel(p.stock)}`]}`}>{p.stock}</span>
                <button className={styles.stockBtnSm} onClick={() => handleStockChange(p.id, +1, p.stock)}>+</button>
              </div>
              <span className={styles.price}>{(p.price * p.stock).toFixed(0)}€</span>
              <div className={styles.rowActions}>
                <button className={styles.editBtnSm} onClick={() => openEdit(p)}>Editar</button>
                <button className={styles.deleteBtnSm} onClick={() => handleDelete(p.id, p.name)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal (direct form) */}
      {showForm && editingId && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Editar producto</h2>
              <button className={styles.modalClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.imageSection}>
                {form.photoURL ? (
                  <img src={form.photoURL} alt="Preview" className={styles.imagePreview} />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <span>{CATEGORY_ICONS[form.category] ?? '📦'}</span>
                    <p>Sin imagen</p>
                  </div>
                )}
              </div>
              <div className={styles.modalFields}>
                <div className={styles.field}>
                  <label>Nombre del producto *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Gel fijador fuerte" />
                </div>
                <div className={styles.field}>
                  <label>Descripción</label>
                  <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción breve del producto" />
                </div>
                <div className={styles.field}>
                  <label>Imagen del producto</label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={editFileInputRef}
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                      e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? `Subiendo... ${uploadProgress}%` : 'Subir imagen'}
                  </button>
                  {uploading && (
                    <div className={styles.uploadProgressBar}>
                      <div className={styles.uploadProgressFill} style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                  <div className={styles.uploadDivider}>
                    <span>o pegar URL</span>
                  </div>
                  <input value={form.photoURL} onChange={e => setForm(p => ({ ...p, photoURL: e.target.value }))} placeholder="https://ejemplo.com/imagen.jpg" />
                </div>
                <div className={styles.row3}>
                  <div className={styles.field}>
                    <label>Precio (€) *</label>
                    <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: +e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label>Stock</label>
                    <input type="number" min="0" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: +e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label>Categoría</label>
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Wizard (multi-step) */}
      {showForm && !editingId && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.wizard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Nuevo producto</h2>
              <button className={styles.modalClose} onClick={() => setShowForm(false)}>✕</button>
            </div>

            {/* Step indicator */}
            <div className={styles.wizardSteps}>
              {WIZARD_STEPS.map((s, i) => (
                <div key={s.num} className={`${styles.wizStep} ${wizardStep === s.num ? styles.wizStepActive : ''} ${wizardStep > s.num ? styles.wizStepDone : ''}`}>
                  <div className={styles.wizStepCircle}>
                    {wizardStep > s.num ? '✓' : s.icon}
                  </div>
                  <span className={styles.wizStepLabel}>{s.label}</span>
                  {i < WIZARD_STEPS.length - 1 && <div className={`${styles.wizStepLine} ${wizardStep > s.num ? styles.wizStepLineDone : ''}`} />}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className={styles.wizardProgress}>
              <div className={styles.wizardProgressFill} style={{ width: `${(wizardStep / 3) * 100}%` }} />
            </div>

            <div className={styles.wizardBody}>
              {/* Step 1: Basic info */}
              {wizardStep === 1 && (
                <div className={styles.wizardPanel}>
                  <p className={styles.wizardHint}>Empieza con los datos básicos del producto</p>
                  <div className={styles.modalFields}>
                    <div className={styles.field}>
                      <label>Nombre del producto *</label>
                      <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Gel fijador fuerte" autoFocus />
                    </div>
                    <div className={styles.field}>
                      <label>Descripción</label>
                      <textarea
                        className={styles.textarea}
                        value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Describe el producto para que tus clientes sepan qué están comprando..."
                        rows={3}
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Categoría</label>
                      <div className={styles.categoryGrid}>
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            className={`${styles.categoryCard} ${form.category === cat ? styles.categoryCardActive : ''}`}
                            onClick={() => setForm(p => ({ ...p, category: cat }))}
                          >
                            <span className={styles.categoryCardIcon}>{CATEGORY_ICONS[cat]}</span>
                            <span>{cat}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Image & pricing */}
              {wizardStep === 2 && (
                <div className={styles.wizardPanel}>
                  <p className={styles.wizardHint}>Añade una imagen y define el precio</p>
                  <div className={styles.modalFields}>
                    <div className={styles.field}>
                      <label>Imagen del producto</label>
                      <div className={styles.imageUploadArea}>
                        {form.photoURL ? (
                          <div className={styles.imagePreviewWrap}>
                            <img src={form.photoURL} alt="Preview" className={styles.imagePreviewLg} />
                            <button className={styles.imageRemoveBtn} onClick={() => setForm(p => ({ ...p, photoURL: '' }))}>✕ Quitar</button>
                          </div>
                        ) : (
                          <div className={styles.imageDropzone} onClick={() => fileInputRef.current?.click()}>
                            <span className={styles.imageDropzoneIcon}>{CATEGORY_ICONS[form.category] ?? '📦'}</span>
                            <p>{uploading ? `Subiendo... ${uploadProgress}%` : 'Haz clic para subir una imagen'}</p>
                            {uploading && (
                              <div className={styles.uploadProgressBar}>
                                <div className={styles.uploadProgressFill} style={{ width: `${uploadProgress}%` }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(file)
                          e.target.value = ''
                        }}
                      />
                      <button
                        type="button"
                        className={styles.uploadBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? `Subiendo... ${uploadProgress}%` : 'Subir imagen'}
                      </button>
                      <div className={styles.uploadDivider}>
                        <span>o pegar URL</span>
                      </div>
                      <input
                        value={form.photoURL}
                        onChange={e => setForm(p => ({ ...p, photoURL: e.target.value }))}
                        placeholder="https://ejemplo.com/producto.jpg"
                        className={styles.imageUrlInput}
                      />
                    </div>
                    <div className={styles.row2}>
                      <div className={styles.field}>
                        <label>Precio de venta (€) *</label>
                        <div className={styles.priceInput}>
                          <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: +e.target.value }))} />
                          <span className={styles.priceSuffix}>€</span>
                        </div>
                      </div>
                      <div className={styles.field}>
                        <label>Stock inicial (unidades)</label>
                        <div className={styles.stockInput}>
                          <button type="button" className={styles.stockAdjBtn} onClick={() => setForm(p => ({ ...p, stock: Math.max(0, p.stock - 1) }))}>−</button>
                          <input type="number" min="0" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: +e.target.value }))} />
                          <button type="button" className={styles.stockAdjBtn} onClick={() => setForm(p => ({ ...p, stock: p.stock + 1 }))}>+</button>
                        </div>
                      </div>
                    </div>
                    {form.price > 0 && form.stock > 0 && (
                      <div className={styles.valuePreview}>
                        Valor total del stock: <strong>{(form.price * form.stock).toFixed(2)}€</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {wizardStep === 3 && (
                <div className={styles.wizardPanel}>
                  <p className={styles.wizardHint}>Revisa que todo esté correcto antes de crear</p>
                  <div className={styles.reviewCard}>
                    <div className={styles.reviewTop}>
                      {form.photoURL ? (
                        <img src={form.photoURL} alt="Preview" className={styles.reviewImg} />
                      ) : (
                        <div className={styles.reviewImgPlaceholder}>
                          <span>{CATEGORY_ICONS[form.category] ?? '📦'}</span>
                        </div>
                      )}
                      <div className={styles.reviewInfo}>
                        <span className={styles.reviewCategory}>{form.category}</span>
                        <h3 className={styles.reviewName}>{form.name || 'Sin nombre'}</h3>
                        {form.description && <p className={styles.reviewDesc}>{form.description}</p>}
                      </div>
                    </div>
                    <div className={styles.reviewStats}>
                      <div className={styles.reviewStat}>
                        <span className={styles.reviewStatLabel}>Precio</span>
                        <span className={styles.reviewStatValue}>{form.price.toFixed(2)}€</span>
                      </div>
                      <div className={styles.reviewStat}>
                        <span className={styles.reviewStatLabel}>Stock</span>
                        <span className={styles.reviewStatValue}>{form.stock} uds</span>
                      </div>
                      <div className={styles.reviewStat}>
                        <span className={styles.reviewStatLabel}>Valor total</span>
                        <span className={styles.reviewStatValue}>{(form.price * form.stock).toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard navigation */}
            <div className={styles.wizardNav}>
              {wizardStep > 1 ? (
                <button className={styles.wizBackBtn} onClick={() => setWizardStep(s => s - 1)}>← Anterior</button>
              ) : (
                <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
              )}
              {wizardStep < 3 ? (
                <button
                  className={styles.wizNextBtn}
                  onClick={() => setWizardStep(s => s + 1)}
                  disabled={wizardStep === 1 && !form.name.trim()}
                >
                  Siguiente →
                </button>
              ) : (
                <button className={styles.wizCreateBtn} onClick={handleSave} disabled={saving || !form.name.trim()}>
                  {saving ? 'Creando...' : '✓ Crear producto'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
