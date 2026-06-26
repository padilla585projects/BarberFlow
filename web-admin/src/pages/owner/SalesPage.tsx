import { useEffect, useState } from 'react'
import { getAllBarbershops, getBarbershopById } from '../../services/barbershops'
import { getUsersByBarbershop } from '../../services/users'
import { getProductsByBarbershop } from '../../services/inventory'
import { getSalesByBarbershop, createSale } from '../../services/sales'
import { useAuth } from '../../contexts/AuthContext'
import { Barbershop, User, Product, Service, Sale, SaleItem } from '../../types'
import styles from './SalesPage.module.css'

type CartItem = SaleItem & { _key: string }

export default function SalesPage() {
  const { user } = useAuth()
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [barbers, setBarbers] = useState<User[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [barberFilter, setBarberFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  // Modal
  const [modal, setModal] = useState(false)
  const [catalogTab, setCatalogTab] = useState<'services' | 'products'>('services')
  const [selectedBarber, setSelectedBarber] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [saving, setSaving] = useState(false)

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const [shop, users, prods, salesData] = await Promise.all([
      getBarbershopById(shopId),
      getUsersByBarbershop(shopId),
      getProductsByBarbershop(shopId),
      getSalesByBarbershop(shopId),
    ])
    const bs = users.filter(u => u.role === 'barber' || u.role === 'owner')
    setBarbers(bs)
    setServices(shop?.services ?? [])
    setProducts(prods)
    setSales(salesData)
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

  const openModal = () => {
    setCart([])
    setSelectedBarber(barbers[0]?.uid ?? '')
    setCatalogTab('services')
    setModal(true)
  }

  const addToCart = (item: Omit<CartItem, '_key' | 'quantity'>) => {
    setCart(prev => {
      const existing = prev.find(c => c.itemId === item.itemId)
      if (existing) {
        return prev.map(c => c.itemId === item.itemId ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { ...item, quantity: 1, _key: `${item.itemId}-${Date.now()}` }]
    })
  }

  const removeFromCart = (itemId: string) =>
    setCart(prev => prev.filter(c => c.itemId !== itemId))

  const changeQty = (itemId: string, delta: number) =>
    setCart(prev => prev
      .map(c => c.itemId === itemId ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)
    )

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0)

  const handleSave = async () => {
    if (!selectedBarber || cart.length === 0) return
    setSaving(true)
    const sale: Omit<Sale, 'id'> = {
      barberId: selectedBarber,
      barbershopId: selectedShop,
      items: cart.map(({ _key, ...rest }) => rest),
      totalAmount: cartTotal,
      date: new Date(),
    }
    const id = await createSale(sale)
    setSales(prev => [{ ...sale, id, date: new Date() }, ...prev])
    setModal(false)
    setSaving(false)
  }

  // Filtered sales
  const filtered = sales
    .filter(s => barberFilter === 'all' || s.barberId === barberFilter)
    .filter(s => !dateFilter || new Date(s.date).toLocaleDateString('es-ES') === new Date(dateFilter).toLocaleDateString('es-ES'))

  const getBarberName = (id: string) => barbers.find(b => b.uid === id)?.displayName ?? id.slice(0, 8)

  // Stats
  const todaySales = sales.filter(s => new Date(s.date).toDateString() === new Date().toDateString())
  const totalRevenue = sales.reduce((s, v) => s + v.totalAmount, 0)
  const avgTicket = sales.length ? totalRevenue / sales.length : 0
  const productSales = sales.flatMap(s => s.items.filter(i => i.type === 'product')).reduce((s, i) => s + i.quantity, 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Ventas</h1>
          <p className={styles.sub}>{sales.length} ventas · {barbershops.find(b => b.id === selectedShop)?.name}</p>
        </div>
        <div className={styles.headerActions}>
          {user?.role === 'developer' && (
            <select className={styles.shopSelect} value={selectedShop}
              onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}>
              {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button className={styles.addBtn} onClick={openModal}>+ Nueva venta</button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{todaySales.length}</span>
          <span className={styles.statLabel}>Ventas hoy</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{todaySales.reduce((s, v) => s + v.totalAmount, 0).toFixed(0)}€</span>
          <span className={styles.statLabel}>Ingresos hoy</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{avgTicket.toFixed(2)}€</span>
          <span className={styles.statLabel}>Ticket medio</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{productSales}</span>
          <span className={styles.statLabel}>Productos vendidos</span>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filters}>
        <select className={styles.filterSelect} value={barberFilter}
          onChange={e => setBarberFilter(e.target.value)}>
          <option value="all">Todos los barberos</option>
          {barbers.map(b => <option key={b.uid} value={b.uid}>{b.displayName}</option>)}
        </select>
        <input type="date" className={styles.filterDate} value={dateFilter}
          onChange={e => setDateFilter(e.target.value)} />
        {dateFilter && (
          <button className={styles.clearBtn} onClick={() => setDateFilter('')}>✕ Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>💶</span>
          <p>No hay ventas {dateFilter || barberFilter !== 'all' ? 'con estos filtros' : 'todavía'}</p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Barbero</span>
            <span>Artículos</span>
            <span>Fecha y hora</span>
            <span>Total</span>
          </div>
          {filtered.map(sale => (
            <div key={sale.id} className={styles.row}>
              <span className={styles.cell}>{getBarberName(sale.barberId)}</span>
              <div className={styles.items}>
                {sale.items.map((item, i) => (
                  <span key={i} className={`${styles.itemTag} ${item.type === 'product' ? styles.productTag : ''}`}>
                    {item.quantity > 1 && <span className={styles.qty}>{item.quantity}×</span>}
                    {item.name}
                  </span>
                ))}
              </div>
              <div className={styles.dateCell}>
                <span>{new Date(sale.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className={styles.time}>{new Date(sale.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <span className={styles.total}>{sale.totalAmount.toFixed(2)}€</span>
            </div>
          ))}
        </div>
      )}

      {/* Modal nueva venta — TPV */}
      {modal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className={styles.tpv}>
            {/* Header */}
            <div className={styles.tpvHeader}>
              <h2>Nueva venta</h2>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>

            {/* Barbero */}
            <div className={styles.barberSelect}>
              <label>Barbero</label>
              <select value={selectedBarber} onChange={e => setSelectedBarber(e.target.value)}>
                {barbers.map(b => <option key={b.uid} value={b.uid}>{b.displayName}</option>)}
              </select>
            </div>

            <div className={styles.tpvBody}>
              {/* Catálogo */}
              <div className={styles.catalog}>
                <div className={styles.catalogTabs}>
                  <button
                    className={`${styles.catTab} ${catalogTab === 'services' ? styles.catTabActive : ''}`}
                    onClick={() => setCatalogTab('services')}
                  >
                    ✂️ Servicios ({services.length})
                  </button>
                  <button
                    className={`${styles.catTab} ${catalogTab === 'products' ? styles.catTabActive : ''}`}
                    onClick={() => setCatalogTab('products')}
                  >
                    📦 Productos ({products.length})
                  </button>
                </div>

                <div className={styles.catalogList}>
                  {catalogTab === 'services' && services.map(s => (
                    <button
                      key={s.id}
                      className={`${styles.catalogItem} ${cart.some(c => c.itemId === s.id) ? styles.catalogItemActive : ''}`}
                      onClick={() => addToCart({ type: 'service', itemId: s.id, name: s.name, price: s.price })}
                    >
                      <div className={styles.catalogName}>{s.name}</div>
                      <div className={styles.catalogMeta}>
                        <span className={styles.catalogDuration}>⏱ {s.duration} min</span>
                        <span className={styles.catalogPrice}>{s.price.toFixed(2)}€</span>
                      </div>
                    </button>
                  ))}

                  {catalogTab === 'products' && products.map(p => (
                    <button
                      key={p.id}
                      className={`${styles.catalogItem} ${cart.some(c => c.itemId === p.id) ? styles.catalogItemActive : ''} ${p.stock === 0 ? styles.catalogItemOut : ''}`}
                      onClick={() => p.stock > 0 && addToCart({ type: 'product', itemId: p.id, name: p.name, price: p.price })}
                      disabled={p.stock === 0}
                    >
                      <div className={styles.catalogName}>{p.name}</div>
                      <div className={styles.catalogMeta}>
                        <span className={`${styles.catalogStock} ${p.stock <= 3 ? styles.catalogStockLow : ''}`}>
                          Stock: {p.stock}
                        </span>
                        <span className={styles.catalogPrice}>{p.price.toFixed(2)}€</span>
                      </div>
                    </button>
                  ))}

                  {catalogTab === 'services' && services.length === 0 && (
                    <p className={styles.catalogEmpty}>No hay servicios. Añade desde la sección Servicios.</p>
                  )}
                  {catalogTab === 'products' && products.length === 0 && (
                    <p className={styles.catalogEmpty}>No hay productos en el inventario.</p>
                  )}
                </div>
              </div>

              {/* Ticket */}
              <div className={styles.ticket}>
                <div className={styles.ticketTitle}>Ticket</div>

                {cart.length === 0 ? (
                  <div className={styles.ticketEmpty}>
                    <span>🧾</span>
                    <p>Añade servicios o productos</p>
                  </div>
                ) : (
                  <div className={styles.ticketItems}>
                    {cart.map(item => (
                      <div key={item._key} className={styles.ticketItem}>
                        <div className={styles.ticketItemInfo}>
                          <span className={styles.ticketItemName}>{item.name}</span>
                          <span className={`${styles.ticketItemType} ${item.type === 'product' ? styles.ticketItemTypeProduct : ''}`}>
                            {item.type === 'service' ? 'Servicio' : 'Producto'}
                          </span>
                        </div>
                        <div className={styles.ticketItemControls}>
                          <button className={styles.qtyBtn} onClick={() => changeQty(item.itemId, -1)}>−</button>
                          <span className={styles.qtyNum}>{item.quantity}</span>
                          <button className={styles.qtyBtn} onClick={() => changeQty(item.itemId, +1)}>+</button>
                          <span className={styles.ticketItemPrice}>{(item.price * item.quantity).toFixed(2)}€</span>
                          <button className={styles.removeBtn} onClick={() => removeFromCart(item.itemId)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.ticketFooter}>
                  <div className={styles.ticketSubtotals}>
                    {cart.filter(c => c.type === 'service').length > 0 && (
                      <div className={styles.subtotalRow}>
                        <span>Servicios</span>
                        <span>{cart.filter(c => c.type === 'service').reduce((s, c) => s + c.price * c.quantity, 0).toFixed(2)}€</span>
                      </div>
                    )}
                    {cart.filter(c => c.type === 'product').length > 0 && (
                      <div className={styles.subtotalRow}>
                        <span>Productos</span>
                        <span>{cart.filter(c => c.type === 'product').reduce((s, c) => s + c.price * c.quantity, 0).toFixed(2)}€</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.ticketTotal}>
                    <span>TOTAL</span>
                    <span className={styles.ticketTotalAmount}>{cartTotal.toFixed(2)}€</span>
                  </div>
                  <button
                    className={styles.cobrarBtn}
                    onClick={handleSave}
                    disabled={cart.length === 0 || !selectedBarber || saving}
                  >
                    {saving ? 'Registrando...' : `💶 Cobrar ${cartTotal.toFixed(2)}€`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
