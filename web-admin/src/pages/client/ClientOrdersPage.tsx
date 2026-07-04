import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getOrdersByClient } from '../../services/orders'
import { Order } from '../../types'
import styles from './ClientOrdersPage.module.css'

const STATUS_LABEL: Record<Order['status'], string> = {
  pending:    'Pendiente',
  processing: 'En proceso',
  shipped:    'Enviado',
  delivered:  'Entregado',
  cancelled:  'Cancelado',
}

const STATUS_CLASS: Record<Order['status'], string> = {
  pending:    'statusPending',
  processing: 'statusProcessing',
  shipped:    'statusShipped',
  delivered:  'statusDelivered',
  cancelled:  'statusCancelled',
}

export default function ClientOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (!user) return
    setLoading(true)
    getOrdersByClient(user.uid)
      .then(setOrders)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [user])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mis Pedidos</h1>
        <button className={styles.refreshBtn} onClick={load} disabled={loading}>
          {loading ? '...' : '↻ Actualizar'}
        </button>
      </div>

      {loading && orders.length === 0 && (
        <p className={styles.muted}>Cargando pedidos...</p>
      )}

      {!loading && orders.length === 0 && (
        <div className={styles.empty}>
          <span>📦</span>
          <p>Aún no tienes pedidos</p>
        </div>
      )}

      <div className={styles.list}>
        {orders.map(order => (
          <div key={order.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.orderId}>#{order.id.substring(0, 8).toUpperCase()}</span>
                <span className={styles.barbershopName}>{order.barbershopName}</span>
              </div>
              <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[order.status]]}`}>
                {STATUS_LABEL[order.status]}
              </span>
            </div>

            <div className={styles.itemsList}>
              {order.items.map((item, idx) => (
                <span key={idx} className={styles.itemChip}>
                  {item.name} x{item.quantity}
                </span>
              ))}
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.date}>
                {order.createdAt instanceof Date
                  ? order.createdAt.toLocaleDateString('es-ES')
                  : new Date(order.createdAt).toLocaleDateString('es-ES')
                }
              </span>
              <span className={styles.total}>{order.totalAmount.toFixed(2)} €</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
