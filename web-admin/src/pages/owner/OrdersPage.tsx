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

// ─────────────────────────────────────────────────────────────────────────────
// Shared print helper
// ─────────────────────────────────────────────────────────────────────────────

function openPrintWindow(title: string, html: string, css: string) {
  const win = window.open('', '_blank', 'width=720,height=620')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: Arial, sans-serif; background: #fff; }
    ${css}</style></head><body>${html}</body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 400)
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏷️  ETIQUETA DE ENVÍO — solo remitente / destinatario / nº pedido
//     Sin precio, sin productos. Va pegada en el exterior del paquete.
// ─────────────────────────────────────────────────────────────────────────────

const LABEL_CSS = `
  body { padding: 28px 32px; }
  .brand { font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
           color: #6b7280; padding-bottom: 10px; border-bottom: 2px solid #111; margin-bottom: 14px; }
  .boxes { display: grid; grid-template-columns: 1fr 1fr; border: 2px solid #111;
           border-radius: 4px; overflow: hidden; margin-bottom: 14px; min-height: 130px; }
  .box { padding: 14px 16px; }
  .box + .box { border-left: 2px solid #111; }
  .box-title { font-size: 8px; font-weight: 800; text-transform: uppercase;
               letter-spacing: 0.14em; color: #9ca3af; margin-bottom: 8px; }
  .name { font-size: 15px; font-weight: 800; color: #111; margin-bottom: 4px; }
  .addr { font-size: 12px; color: #374151; line-height: 1.65; }
  .barcode { font-size: 26px; letter-spacing: 0.06em; font-family: monospace;
             text-align: center; margin: 12px 0 10px; color: #111; }
  .order-strip { display: flex; justify-content: space-between; align-items: center;
                 padding: 8px 12px; background: #f3f4f6; border: 1px solid #e5e7eb;
                 border-radius: 4px; font-size: 11px; color: #6b7280; }
  .order-id { font-family: monospace; font-size: 14px; font-weight: 800;
              color: #111; letter-spacing: 0.1em; }
  .note { font-size: 10px; color: #9ca3af; margin-top: 10px; text-align: center; }
`

interface LabelProps {
  order: Order
  barbershop: Barbershop | undefined
  onClose: () => void
}

function ShippingLabelModal({ order, barbershop, onClose }: LabelProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const addr = order.shippingAddress as ShippingAddress

  const dateStr = order.createdAt instanceof Date
    ? order.createdAt.toLocaleDateString('es-ES')
    : new Date((order.createdAt as any).seconds * 1000).toLocaleDateString('es-ES')

  const labelHtml = `
    <div class="brand">BarberFlow · Etiqueta de envío</div>
    <div class="boxes">
      <div class="box">
        <div class="box-title">Remitente (FROM)</div>
        <div class="name">${barbershop?.name ?? order.barbershopName ?? '—'}</div>
        <div class="addr">${barbershop?.address ?? '—'}${barbershop?.phone ? `<br>${barbershop.phone}` : ''}</div>
      </div>
      <div class="box">
        <div class="box-title">Destinatario (TO)</div>
        <div class="name">${order.clientName}</div>
        <div class="addr">
          ${addr.street}<br>
          ${addr.postalCode} ${addr.city}<br>
          ${addr.province}${addr.country ? `, ${addr.country}` : ''}
        </div>
      </div>
    </div>
    <div class="barcode">|||&nbsp;&nbsp;${order.id.slice(-10).toUpperCase()}&nbsp;&nbsp;|||</div>
    <div class="order-strip">
      <div>Pedido <span class="order-id">#${order.id.slice(-8).toUpperCase()}</span></div>
      <div>${dateStr}</div>
    </div>
    <div class="note">No indica contenido ni valor — etiqueta de transporte</div>
  `

  return (
    <div className={styles.labelOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.labelModal}>
        <div className={styles.labelModalHeader}>
          <span className={styles.labelModalTitle}>🏷️ Etiqueta de envío — #{order.id.slice(-8).toUpperCase()}</span>
          <button className={styles.labelModalClose} onClick={onClose}>✕</button>
        </div>

        {/* Preview */}
        <div ref={printRef} className={styles.labelSheet} style={{ background: '#fff', color: '#000' }}>
          <div className={styles.labelBrand}>BarberFlow · Etiqueta de envío</div>
          <div className={styles.labelBoxes}>
            <div className={styles.labelBox}>
              <div className={styles.labelBoxTitle}>Remitente (FROM)</div>
              <div className={styles.labelName}>{barbershop?.name ?? order.barbershopName ?? '—'}</div>
              <div className={styles.labelAddr}>
                {barbershop?.address ?? '—'}
                {barbershop?.phone && <><br />{barbershop.phone}</>}
              </div>
            </div>
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
            {'|'.repeat(3)}&nbsp;&nbsp;{order.id.slice(-10).toUpperCase()}&nbsp;&nbsp;{'|'.repeat(3)}
          </div>
          <div className={styles.labelOrderInfo}>
            <div>
              <span style={{ fontSize: 11, color: '#6b7280' }}>Pedido&nbsp;</span>
              <span className={styles.labelOrderId}>#{order.id.slice(-8).toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{dateStr}</div>
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 10 }}>
            No indica contenido ni valor — etiqueta de transporte
          </div>
        </div>

        <div className={styles.labelModalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cerrar</button>
          <button className={styles.printBtn}
            onClick={() => openPrintWindow(`Etiqueta #${order.id.slice(-8).toUpperCase()}`, labelHtml, LABEL_CSS)}>
            🖨️ Imprimir etiqueta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 🧾  ALBARÁN DE ENTREGA — va dentro del paquete
//     Incluye productos, cantidades, precios y total.
// ─────────────────────────────────────────────────────────────────────────────

const ALBARAN_CSS = `
  body { padding: 32px 36px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
            padding-bottom: 14px; border-bottom: 2px solid #111; margin-bottom: 20px; }
  .brand { font-size: 20px; font-weight: 800; color: #111; }
  .brand-sub { font-size: 10px; color: #6b7280; text-transform: uppercase;
               letter-spacing: 0.1em; margin-top: 2px; }
  .doc-title { font-size: 13px; font-weight: 800; color: #6b7280; text-align: right;
               text-transform: uppercase; letter-spacing: 0.08em; }
  .doc-id { font-family: monospace; font-size: 18px; font-weight: 800; color: #111; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .meta-block { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; }
  .meta-title { font-size: 9px; font-weight: 800; text-transform: uppercase;
                letter-spacing: 0.12em; color: #9ca3af; margin-bottom: 6px; }
  .meta-name { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 2px; }
  .meta-line { font-size: 12px; color: #374151; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
             color: #6b7280; padding: 8px 10px; border-bottom: 2px solid #111; text-align: left; }
  thead th:last-child { text-align: right; }
  tbody td { font-size: 13px; color: #111; padding: 10px 10px; border-bottom: 1px solid #e5e7eb; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  tbody td:nth-child(2) { text-align: center; color: #6b7280; }
  tbody td:nth-child(3) { text-align: right; color: #6b7280; }
  .total-row { display: flex; justify-content: flex-end; }
  .total-box { background: #111; color: #fff; border-radius: 6px; padding: 10px 16px;
               display: flex; gap: 20px; align-items: center; }
  .total-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; }
  .total-value { font-size: 20px; font-weight: 800; }
  .footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e5e7eb;
            font-size: 10px; color: #9ca3af; text-align: center; line-height: 1.8; }
`

interface AlbaranProps {
  order: Order
  barbershop: Barbershop | undefined
  onClose: () => void
}

function AlbaranModal({ order, barbershop, onClose }: AlbaranProps) {
  const addr = order.shippingAddress as ShippingAddress

  const dateStr = order.createdAt instanceof Date
    ? order.createdAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date((order.createdAt as any).seconds * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  const itemRows = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${item.price.toFixed(2)} €</td>
      <td>${(item.price * item.quantity).toFixed(2)} €</td>
    </tr>
  `).join('')

  const albaranHtml = `
    <div class="header">
      <div>
        <div class="brand">${barbershop?.name ?? order.barbershopName ?? 'BarberFlow'}</div>
        <div class="brand-sub">Nota de entrega · Albarán</div>
      </div>
      <div style="text-align:right">
        <div class="doc-title">Albarán nº</div>
        <div class="doc-id">#${order.id.slice(-8).toUpperCase()}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px">${dateStr}</div>
      </div>
    </div>
    <div class="meta">
      <div class="meta-block">
        <div class="meta-title">Vendedor</div>
        <div class="meta-name">${barbershop?.name ?? '—'}</div>
        <div class="meta-line">${barbershop?.address ?? '—'}</div>
        ${barbershop?.phone ? `<div class="meta-line">${barbershop.phone}</div>` : ''}
      </div>
      <div class="meta-block">
        <div class="meta-title">Cliente</div>
        <div class="meta-name">${order.clientName}</div>
        <div class="meta-line">${order.clientEmail}</div>
        ${addr ? `<div class="meta-line">${addr.street}<br>${addr.postalCode} ${addr.city}<br>${addr.province}</div>` : '<div class="meta-line">Recogida en tienda</div>'}
      </div>
    </div>
    <table>
      <thead><tr>
        <th>Producto</th><th style="text-align:center">Cant.</th>
        <th style="text-align:right">Precio unit.</th><th style="text-align:right">Total</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="total-row">
      <div class="total-box">
        <span class="total-label">Total</span>
        <span class="total-value">${order.totalAmount.toFixed(2)} €</span>
      </div>
    </div>
    ${order.notes ? `<div style="margin-top:14px;font-size:12px;color:#6b7280">📝 Nota: ${order.notes}</div>` : ''}
    <div class="footer">
      Gracias por tu compra · ${barbershop?.name ?? 'BarberFlow'}<br>
      Conserva este albarán como justificante de tu pedido
    </div>
  `

  return (
    <div className={styles.labelOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.labelModal} style={{ maxWidth: 560 }}>
        <div className={styles.labelModalHeader}>
          <span className={styles.labelModalTitle}>🧾 Albarán de entrega — #{order.id.slice(-8).toUpperCase()}</span>
          <button className={styles.labelModalClose} onClick={onClose}>✕</button>
        </div>

        {/* Preview */}
        <div className={styles.labelSheet} style={{ background: '#fff', color: '#000' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            paddingBottom: 12, borderBottom: '2px solid #111', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111' }}>
                {barbershop?.name ?? order.barbershopName ?? 'BarberFlow'}
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase',
                letterSpacing: '0.1em', marginTop: 2 }}>Nota de entrega · Albarán</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase',
                letterSpacing: '0.08em' }}>Albarán nº</div>
              <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: '#111' }}>
                #{order.id.slice(-8).toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{dateStr}</div>
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {[
              { title: 'Vendedor', name: barbershop?.name ?? '—',
                lines: [barbershop?.address ?? '—', barbershop?.phone ?? ''].filter(Boolean) },
              { title: 'Cliente', name: order.clientName,
                lines: addr
                  ? [order.clientEmail, addr.street, `${addr.postalCode} ${addr.city}`, addr.province]
                  : [order.clientEmail, 'Recogida en tienda'] },
            ].map(block => (
              <div key={block.title} style={{ background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.12em', color: '#9ca3af', marginBottom: 6 }}>{block.title}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 }}>{block.name}</div>
                {block.lines.map((l, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{l}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #111' }}>
                {['Producto', 'Cant.', 'Precio unit.', 'Total'].map((h, i) => (
                  <th key={h} style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: '#6b7280', padding: '6px 8px', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ fontSize: 12, color: '#111', padding: '8px 8px' }}>{item.name}</td>
                  <td style={{ fontSize: 12, color: '#6b7280', textAlign: 'right', padding: '8px 8px' }}>{item.quantity}</td>
                  <td style={{ fontSize: 12, color: '#6b7280', textAlign: 'right', padding: '8px 8px' }}>{item.price.toFixed(2)} €</td>
                  <td style={{ fontSize: 12, fontWeight: 600, color: '#111', textAlign: 'right', padding: '8px 8px' }}>
                    {(item.price * item.quantity).toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ background: '#111', color: '#fff', borderRadius: 6, padding: '8px 14px',
              display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{order.totalAmount.toFixed(2)} €</span>
            </div>
          </div>

          {order.notes && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280' }}>📝 {order.notes}</div>
          )}

          <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid #e5e7eb',
            fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 1.8 }}>
            Gracias por tu compra · {barbershop?.name ?? 'BarberFlow'}<br />
            Conserva este albarán como justificante de tu pedido
          </div>
        </div>

        <div className={styles.labelModalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cerrar</button>
          <button className={styles.printBtn}
            onClick={() => openPrintWindow(`Albarán #${order.id.slice(-8).toUpperCase()}`, albaranHtml, ALBARAN_CSS)}>
            🖨️ Imprimir albarán
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders]             = useState<Order[]>([])
  const [barbershops, setBarbershops]   = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [loading, setLoading]           = useState(true)
  const [filterStatus, setFilterStatus] = useState<Order['status'] | 'all'>('all')
  const [updating, setUpdating]         = useState<string | null>(null)
  const [expanded, setExpanded]         = useState<string | null>(null)
  const [labelOrder, setLabelOrder]     = useState<Order | null>(null)
  const [albaranOrder, setAlbaranOrder] = useState<Order | null>(null)

  // ── Future courier integration hook ───────────────────────────────────────
  // When integrating a carrier (SEUR, Correos, MRW, GLS...):
  // 1. Add `courierService?: string` and `trackingNumber?: string` to the Order type
  // 2. Add a service in /services/courier.ts that calls their API to create a shipment
  // 3. The API will return the official label PDF/ZPL and a tracking number
  // 4. Store the tracking number on the order doc and show it here
  // 5. Replace the custom label with the carrier's official label

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

                  {/* Envío / recogida */}
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
                      <div className={styles.labelBtns}>
                        <button className={styles.labelBtn} onClick={() => setLabelOrder(order)}>
                          🏷️ Etiqueta
                        </button>
                        <button className={styles.albaranBtn} onClick={() => setAlbaranOrder(order)}>
                          🧾 Albarán
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.pickupRow}>
                      <span>🏠 Recogida en tienda</span>
                      <button className={styles.albaranBtn} onClick={() => setAlbaranOrder(order)}>
                        🧾 Albarán
                      </button>
                    </div>
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

      {labelOrder && (
        <ShippingLabelModal
          order={labelOrder}
          barbershop={barbershops.find(b => b.id === labelOrder.barbershopId)}
          onClose={() => setLabelOrder(null)}
        />
      )}
      {albaranOrder && (
        <AlbaranModal
          order={albaranOrder}
          barbershop={barbershops.find(b => b.id === albaranOrder.barbershopId)}
          onClose={() => setAlbaranOrder(null)}
        />
      )}
    </div>
  )
}
