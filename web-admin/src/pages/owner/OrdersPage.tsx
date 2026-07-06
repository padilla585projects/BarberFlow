import { useEffect, useRef, useState } from 'react'
import { getOrdersByBarbershop, updateOrderStatus } from '../../services/orders'
import { getAllBarbershops } from '../../services/barbershops'
import { useAuth } from '../../contexts/AuthContext'
import { Order, Barbershop, ShippingAddress } from '../../types'
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

// ── Shipping Label Modal ───────────────────────────────────────────────────

interface LabelProps {
  order: Order
  barbershop: Barbershop | undefined
  onClose: () => void
}

function ShippingLabelModal({ order, barbershop, onClose }: LabelProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const addr = order.shippingAddress as ShippingAddress

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank', 'width=700,height=600')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta #${order.id.slice(-8).toUpperCase()}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; background: #fff; padding: 32px; }
            .brand { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
                     color: #6b7280; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #111; }
            .boxes { display: grid; grid-template-columns: 1fr 1fr; border: 2px solid #111;
                     border-radius: 4px; overflow: hidden; margin-bottom: 16px; }
            .box { padding: 16px; }
            .box + .box { border-left: 2px solid #111; }
            .box-title { font-size: 9px; font-weight: 800; text-transform: uppercase;
                         letter-spacing: 0.12em; color: #6b7280; margin-bottom: 8px; }
            .name { font-size: 16px; font-weight: 800; color: #111; margin-bottom: 4px; }
            .addr { font-size: 12px; color: #374151; line-height: 1.6; }
            .order-info { display: flex; justify-content: space-between; align-items: center;
                          padding: 10px 12px; background: #f9fafb; border: 1px solid #e5e7eb;
                          border-radius: 4px; font-size: 11px; color: #6b7280; }
            .order-id { font-family: monospace; font-size: 13px; font-weight: 700;
                        color: #111; letter-spacing: 0.08em; }
            .barcode { font-size: 28px; letter-spacing: 0.05em; color: #111;
                       font-family: monospace; text-align: center; margin: 12px 0 4px; }
            .items { margin-top: 12px; font-size: 11px; color: #374151; line-height: 1.7; }
            .items-title { font-size: 9px; font-weight: 800; text-transform: uppercase;
                           letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 4px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  const dateStr = order.createdAt instanceof Date
    ? order.createdAt.toLocaleDateString('es-ES')
    : new Date((order.createdAt as any).seconds * 1000).toLocaleDateString('es-ES')

  return (
    <div className={styles.labelOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.labelModal}>
        <div className={styles.labelModalHeader}>
          <span className={styles.labelModalTitle}>🏷️ Etiqueta de envío — #{order.id.slice(-8).toUpperCase()}</span>
          <button className={styles.labelModalClose} onClick={onClose}>✕</button>
        </div>

        {/* Printable content */}
        <div ref={printRef} className={styles.labelSheet}>
          <div className={styles.labelBrand}>BarberFlow — Etiqueta de envío</div>

          <div className={styles.labelBoxes}>
            {/* FROM */}
            <div className={styles.labelBox}>
              <div className={styles.labelBoxTitle}>Remitente (FROM)</div>
              <div className={styles.labelName}>{barbershop?.name ?? order.barbershopName ?? '—'}</div>
              <div className={styles.labelAddr}>
                {barbershop?.address ?? '—'}
                {barbershop?.phone ? <><br />{barbershop.phone}</> : null}
              </div>
            </div>

            {/* TO */}
            <div className={styles.labelBox}>
              <div className={styles.labelBoxTitle}>Destinatario (TO)</div>
              <div className={styles.labelName}>{order.clientName}</div>
              <div className={styles.labelAddr}>
                {addr.street}<br />
                {addr.postalCode} {addr.city}<br />
                {addr.province}{addr.country ? `, ${addr.country}` : ''}
              </div>
            </div>
          </div>

          <div className={styles.labelBarcode}>
            {'|'.repeat(3)} &nbsp; {order.id.slice(-10).toUpperCase()} &nbsp; {'|'.repeat(3)}
          </div>

          <div className={styles.labelOrderInfo}>
            <div>
              <div style={{ marginBottom: 2 }}>Pedido</div>
              <div className={styles.labelOrderId}>#{order.id.slice(-8).toUpperCase()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>{dateStr}</div>
              <div style={{ marginTop: 2, fontWeight: 700, color: '#111' }}>
                {order.totalAmount.toFixed(2)} €
              </div>
            </div>
          </div>

          {/* Items */}
          <div className={styles.labelSheet} style={{ padding: '10px 0 0' }}>
            <div className={`${styles.labelBoxTitle} ${styles.labelOrderInfo}`}
                 style={{ background: 'none', border: 'none', padding: 0 }}>
              Contenido
            </div>
            {order.items.map((item, i) => (
              <div key={i} style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
                {item.quantity}x {item.name}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.labelModalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cerrar</button>
          <button className={styles.printBtn} onClick={handlePrint}>🖨️ Imprimir etiqueta</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders]           = useState<Order[]>([])
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [loading, setLoading]         = useState(true)
  const [filterStatus, setFilterStatus] = useState<Order['status'] | 'all'>('all')
  const [updating, setUpdating]       = useState<string | null>(null)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [labelOrder, setLabelOrder]   = useState<Order | null>(null)

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const data = await getOrdersByBarbershop(shopId)
    setOrders(data)
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

  const currentBarbershop = barbershops.find(b => b.id === selectedShop)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Pedidos Shop</h1>
          <p className={styles.sub}>{orders.length} pedidos · {currentBarbershop?.name}</p>
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

                  {/* Dirección de envío */}
                  {order.shippingAddress ? (
                    <div className={styles.shippingBlock}>
                      <div className={styles.shippingInfo}>
                        <div className={styles.shippingTitle}>📦 Dirección de envío</div>
                        <div className={styles.shippingLine}>{order.shippingAddress.street}</div>
                        <div className={styles.shippingLine}>
                          {order.shippingAddress.postalCode} {order.shippingAddress.city}
                        </div>
                        <div className={styles.shippingLine}>
                          {order.shippingAddress.province}
                          {order.shippingAddress.country ? `, ${order.shippingAddress.country}` : ''}
                        </div>
                      </div>
                      <button
                        className={styles.labelBtn}
                        onClick={() => setLabelOrder(order)}
                      >
                        🏷️ Generar etiqueta
                      </button>
                    </div>
                  ) : (
                    <p className={styles.address}>🏠 Recogida en tienda</p>
                  )}

                  {order.notes && (
                    <p className={styles.address}>📝 {order.notes}</p>
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

      {/* Shipping label modal */}
      {labelOrder && (
        <ShippingLabelModal
          order={labelOrder}
          barbershop={barbershops.find(b => b.id === labelOrder.barbershopId)}
          onClose={() => setLabelOrder(null)}
        />
      )}
    </div>
  )
}
