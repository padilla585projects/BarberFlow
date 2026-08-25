import { useEffect, useMemo, useState } from 'react'
import { getAppointmentsByBarbershop, updateAppointmentPaymentStatus } from '../../services/appointments'
import { getOrdersByBarbershop, updateOrderPaymentStatus } from '../../services/orders'
import { getAllBarbershops } from '../../services/barbershops'
import { getUserById } from '../../services/users'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/common/Toast'
import { Appointment, Barbershop, Order } from '../../types'
import styles from './ClientPaymentsPage.module.css'

type Tab = 'appointments' | 'orders'
type PaymentMethod = NonNullable<Appointment['paymentMethod']>
type PaymentStatus = NonNullable<Appointment['paymentStatus']>

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '💵 Caja',
  bizum: '📱 Bizum',
  paypal: '🅿️ PayPal',
}

interface Row {
  id: string
  clientId: string
  clientLabel: string
  amount: number
  date: Date
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
}

export default function ClientPaymentsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>('appointments')
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [clientNames, setClientNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [showPaid, setShowPaid] = useState(false)

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    try {
      const [apps, ords] = await Promise.all([
        getAppointmentsByBarbershop(shopId),
        getOrdersByBarbershop(shopId),
      ])
      setAppointments(apps)
      setOrders(ords)

      const uniqueClientIds = Array.from(new Set(apps.map(a => a.clientId).filter(Boolean)))
      const missing = uniqueClientIds.filter(id => !clientNames[id])
      if (missing.length > 0) {
        const results = await Promise.all(missing.map(async id => {
          const u = await getUserById(id)
          return [id, u?.displayName ?? id.slice(0, 8)] as const
        }))
        setClientNames(prev => {
          const next = { ...prev }
          results.forEach(([id, name]) => { next[id] = name })
          return next
        })
      }
    } catch {
      showToast('Error al cargar los cobros de clientes', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const allShops = await getAllBarbershops()
        const shops = user?.role === 'developer'
          ? allShops
          : allShops.filter(s => s.ownerId === user?.uid)
        setBarbershops(shops)
        const shopId = user?.barbershopId ?? shops[0]?.id ?? ''
        setSelectedShop(shopId)
        await load(shopId)
      } catch {
        showToast('Error al inicializar la página de cobros', 'error')
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const appointmentRows: Row[] = useMemo(() => appointments.map(a => ({
    id: a.id,
    clientId: a.clientId,
    clientLabel: clientNames[a.clientId] ?? (a.clientId ? a.clientId.slice(0, 8) : 'Cliente'),
    // Legacy appointments were stored without totalPrice; one of them was
    // enough to take the whole page down on .toFixed().
    amount: a.totalPrice ?? 0,
    date: a.date,
    paymentMethod: (a.paymentMethod ?? 'cash') as PaymentMethod,
    paymentStatus: (a.paymentStatus ?? 'pending') as PaymentStatus,
  })), [appointments, clientNames])

  const orderRows: Row[] = useMemo(() => orders.map(o => ({
    id: o.id,
    clientId: o.clientId,
    clientLabel: o.clientName || 'Cliente',
    amount: o.totalAmount ?? 0,
    date: o.createdAt,
    paymentMethod: (o.paymentMethod ?? 'cash') as PaymentMethod,
    paymentStatus: (o.paymentStatus ?? 'pending') as PaymentStatus,
  })), [orders])

  const rows = tab === 'appointments' ? appointmentRows : orderRows

  const pendingConfirm = rows.filter(r => r.paymentStatus === 'client_confirmed')
  const unpaid = rows.filter(r => r.paymentStatus === 'pending' || !r.paymentStatus)
  const paid = rows.filter(r => r.paymentStatus === 'paid' || r.paymentStatus === 'confirmed')

  const totalPendingConfirm = pendingConfirm.reduce((s, r) => s + r.amount, 0)
  const totalUnpaid = unpaid.reduce((s, r) => s + r.amount, 0)
  const totalPaid = paid.reduce((s, r) => s + r.amount, 0)

  const formatDate = (d: Date) => {
    try {
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return '-'
    }
  }

  const handleUpdate = async (row: Row, status: PaymentStatus) => {
    setUpdating(row.id)
    try {
      if (tab === 'appointments') {
        await updateAppointmentPaymentStatus(row.id, status)
        setAppointments(prev => prev.map(a => a.id === row.id ? { ...a, paymentStatus: status } : a))
      } else {
        await updateOrderPaymentStatus(row.id, status)
        setOrders(prev => prev.map(o => o.id === row.id ? { ...o, paymentStatus: status } : o))
      }
      showToast(
        status === 'paid' ? 'Cobro confirmado' : 'Cobro marcado como pendiente',
        'success'
      )
    } catch {
      showToast('Error al actualizar el cobro', 'error')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Cobros de clientes</h1>
          <p className={styles.sub}>
            {rows.length} {tab === 'appointments' ? 'citas' : 'pedidos'} · {barbershops.find(b => b.id === selectedShop)?.name}
          </p>
        </div>
        {user?.role === 'developer' && (
          <select className={styles.shopSelect} value={selectedShop}
            onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}>
            {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Tabs Citas / Pedidos */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'appointments' ? styles.tabActive : ''}`}
          onClick={() => setTab('appointments')}
        >
          Citas
        </button>
        <button
          className={`${styles.tab} ${tab === 'orders' ? styles.tabActive : ''}`}
          onClick={() => setTab('orders')}
        >
          Pedidos
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={`${styles.stat} ${pendingConfirm.length > 0 ? styles.statWarn : ''}`}>
          <span className={styles.statValue}>{totalPendingConfirm.toFixed(2)}€</span>
          <span className={styles.statLabel}>Por confirmar ({pendingConfirm.length})</span>
        </div>
        <div className={`${styles.stat} ${unpaid.length > 0 ? styles.statDanger : ''}`}>
          <span className={styles.statValue}>{totalUnpaid.toFixed(2)}€</span>
          <span className={styles.statLabel}>Sin cobrar ({unpaid.length})</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalPaid.toFixed(2)}€</span>
          <span className={styles.statLabel}>Cobrados ({paid.length})</span>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}>
          <span>💳</span>
          <p>No hay {tab === 'appointments' ? 'citas' : 'pedidos'} todavía</p>
        </div>
      ) : (
        <>
          {/* Pendientes de confirmar */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>⚠️ Pendientes de confirmar</h2>
            {pendingConfirm.length === 0 ? (
              <p className={styles.sectionEmpty}>No hay cobros pendientes de confirmar</p>
            ) : (
              <div className={styles.cardList}>
                {pendingConfirm.map(row => (
                  <div key={row.id} className={styles.card}>
                    <div className={styles.cardInfo}>
                      <span className={styles.clientName}>{row.clientLabel}</span>
                      <span className={styles.methodTag}>{METHOD_LABELS[row.paymentMethod]}</span>
                      <span className={styles.dateTag}>{formatDate(row.date)}</span>
                    </div>
                    <div className={styles.cardRight}>
                      <span className={styles.amount}>{row.amount.toFixed(2)}€</span>
                      <div className={styles.actions}>
                        <button
                          className={styles.confirmBtn}
                          disabled={updating === row.id}
                          onClick={() => handleUpdate(row, 'paid')}
                        >
                          {updating === row.id ? '...' : 'Confirmar'}
                        </button>
                        <button
                          className={styles.rejectBtn}
                          disabled={updating === row.id}
                          onClick={() => handleUpdate(row, 'pending')}
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sin cobrar */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🔴 Sin cobrar</h2>
            {unpaid.length === 0 ? (
              <p className={styles.sectionEmpty}>Todo cobrado, no hay pagos pendientes</p>
            ) : (
              <div className={styles.cardList}>
                {unpaid.map(row => (
                  <div key={row.id} className={styles.card}>
                    <div className={styles.cardInfo}>
                      <span className={styles.clientName}>{row.clientLabel}</span>
                      <span className={styles.methodTag}>{METHOD_LABELS[row.paymentMethod]}</span>
                      <span className={styles.dateTag}>{formatDate(row.date)}</span>
                    </div>
                    <div className={styles.cardRight}>
                      <span className={styles.amount}>{row.amount.toFixed(2)}€</span>
                      {row.paymentMethod === 'cash' && (
                        <button
                          className={styles.confirmBtn}
                          disabled={updating === row.id}
                          onClick={() => handleUpdate(row, 'paid')}
                        >
                          {updating === row.id ? '...' : 'Marcar cobrado'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cobrados (colapsable) */}
          <section className={styles.section}>
            <button className={styles.sectionToggle} onClick={() => setShowPaid(v => !v)}>
              <h2 className={styles.sectionTitle}>✅ Cobrados</h2>
              <span className={styles.toggleIcon}>{showPaid ? '▲' : '▼'}</span>
            </button>
            {showPaid && (
              paid.length === 0 ? (
                <p className={styles.sectionEmpty}>No hay cobros registrados todavía</p>
              ) : (
                <div className={styles.table}>
                  <div className={styles.tableHead}>
                    <span>Cliente</span>
                    <span>Método</span>
                    <span>Fecha</span>
                    <span>Importe</span>
                  </div>
                  {paid.map(row => (
                    <div key={row.id} className={styles.row}>
                      <span className={styles.cell}>{row.clientLabel}</span>
                      <span className={styles.cell}>{METHOD_LABELS[row.paymentMethod]}</span>
                      <span className={styles.cell}>{formatDate(row.date)}</span>
                      <span className={styles.priceCell}>{row.amount.toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>
        </>
      )}
    </div>
  )
}
