import { useEffect, useState } from 'react'
import { getOrdersByBarbershop, updateOrderStatus } from '../../services/orders'
import { getAllBarbershops } from '../../services/barbershops'
import { useAuth } from '../../contexts/AuthContext'
import { Order, Barbershop } from '../../types'
import styles from './OrdersPage.module.css'

const STATUS_LABELS: Record<Order['status'], string> = {
  pending:    'Pendiente',
  processing: 'Procesando',
  shipped:    'Enviado',
  delivered:  'Entregado',
  cancelled:  'Cancelado',
}

const STATUS_COLORS: Record<Order['status'], string> = {
  pending:    '#fbbf24',
  processing: '#60a5fa',
  shipped:    '#a78bfa',
  delivered:  '#4ade80',
  cancelled:  '#f87171',
}

const STATUS_ORDER: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders]           = useState<Order[]>([])
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [loading, setLoading]         = useState(true)
  const [filterStatus, setFilterStatus] = useState<Order['status'] | 'all'>('all')
  const [updating, setUpdating]       = useState<string | null>(null)
  const [expanded, setExpanded]       = useState<string | null>(null)

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const data = await getOrdersByBarbershop(shopId)
    setOrders(data)
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

  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    setUpdating(orderId)
    await updateOrderStatus(orderId, status)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    setUpdating(null)
  }

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)

  const stats = {
    total:     orders.length,
    pending:   orders.filter(o => o.status === 'pending').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    revenue:   orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.totalAmount ?? 0), 0),
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Pedidos Shop</h1>
          <p className={styles.sub}>{orders.length} pedidos · {barbershops.find(b => b.id === selectedShop)?.name}</p>
        </div>
        {user?.role === 'developer' && (
          <select
            className={styles.shopSelect}
            value={selectedShop}
            onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}
          >
            {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={`${styles.stat} ${stats.pending > 0 ? styles.statWarn : ''}`}>
          <span className={styles.statValue}>{stats.pending}</span>
          <span className={styles.statLabel}>Pendientes ⚠️</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.delivered}</span>
          <span className={styles.statLabel}>Entregados</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.revenue.toFixed(0)}€</span>
          <span className={styles.statLabel}>Ingresos</span>
        </div>
      </div>

      <div className={styles.filters}>
        {(['all', ...STATUS_ORDER] as const).map(s => (
          <button
            key={s}
            className={`${styles.filterBtn} ${filterStatus === s ? styles.filterActive : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
            {s !== 'all' && (
              <span className={styles.filterCount}>
                {orders.filter(o => o.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>📦</span>
          <p>No hay pedidos{filterStatus !== 'all' ? ` con estado "${STATUS_LABELS[filterStatus]}"` : ''}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(order => (
            <div key={order.id} className={styles.card}>
              <div className={styles.cardHead} onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <div className={styles.cardLeft}>
                  <span className={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</span>
                  <div>
                    <p className={styles.clientName}>{order.clientName}</p>
                    <p className={styles.clientEmail}>{order.clientEmail}</p>
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <span className={styles.amount}>{order.totalAmount.toFixed(2)}€</span>
                  <span
                    className={styles.status}
                    style={{ background: STATUS_COLORS[order.status] + '22', color: STATUS_COLORS[order.status] }}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span className={styles.date}>
                    {order.createdAt instanceof Date
                      ? order.createdAt.toLocaleDateString('es-ES')
                      : new Date((order.createdAt as any).seconds * 1000).toLocaleDateString('es-ES')}
                  </span>
                  <span className={styles.toggle}>{expanded === order.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === order.id && (
                <div className={styles.cardBody}>
                  <div className={styles.items}>
                    <p className={styles.itemsTitle}>Productos</p>
                    {order.items.map((item, i) => (
                      <div key={i} className={styles.item}>
                        <span>{item.name}</span>
                        <span>{item.quantity}x</span>
                        <span>{((item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>

                  {order.address && (
                    <p className={styles.address}>📍 {order.address}</p>
                  )}

                  <div className={styles.actions}>
                    <span className={styles.actionsLabel}>Cambiar estado:</span>
                    {STATUS_ORDER.filter(s => s !== order.status).map(s => (
                      <button
                        key={s}
                        className={styles.actionBtn}
                        style={{ borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] }}
                        disabled={updating === order.id}
                        onClick={() => handleStatusChange(order.id, s)}
                      >
                        {updating === order.id ? '...' : STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
