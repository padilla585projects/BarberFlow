import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, doc, writeBatch, serverTimestamp, increment, updateDoc
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useWebCart } from '../../contexts/WebCartContext'
import { useAuth } from '../../contexts/AuthContext'
import { getBarbershopById } from '../../services/barbershops'
import styles from './ClientCheckoutPage.module.css'

type PaymentMethod = 'cash' | 'bizum' | 'paypal'

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash',   label: 'Efectivo', icon: '💵' },
  { value: 'bizum',  label: 'Bizum',    icon: '📱' },
  { value: 'paypal', label: 'PayPal',   icon: '🅿️' },
]

const PAYMENT_INSTRUCTIONS: Record<PaymentMethod, string> = {
  cash:   '',
  bizum:  'Envía el importe al número de Bizum de la barbería. Una vez realizado el pago, pulsa "Ya he pagado".',
  paypal: 'Realiza el pago a la cuenta de PayPal de la barbería. Una vez completado, pulsa "Ya he pagado".',
}

export default function ClientCheckoutPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { items, barbershopId, totalPrice, clearCart } = useWebCart()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)

  if (items.length === 0 && !orderId) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <span>🛒</span>
          <p>No hay productos en el carrito</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/client/shop')}>Ir a la tienda</button>
        </div>
      </div>
    )
  }

  const handleOrder = async () => {
    if (!user || !barbershopId) return
    setLoading(true)
    setError('')
    try {
      const barbershop = await getBarbershopById(barbershopId)
      const batch = writeBatch(db)

      const orderRef = doc(collection(db, 'orders'))
      batch.set(orderRef, {
        clientId: user.uid,
        clientName: user.displayName,
        clientEmail: user.email,
        barbershopId,
        barbershopName: barbershop?.name ?? '',
        items: items.map(i => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        totalAmount: totalPrice,
        notes,
        status: 'pending',
        paymentMethod,
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
      })

      // Decrementar stock de cada producto
      for (const item of items) {
        const productRef = doc(db, 'products', item.productId)
        batch.update(productRef, { stock: increment(-item.quantity) })
      }

      await batch.commit()
      setOrderId(orderRef.id)

      if (paymentMethod !== 'cash') {
        setShowPayModal(true)
      } else {
        clearCart()
      }
    } catch (err: any) {
      setError('Error al procesar el pedido. Inténtalo de nuevo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentConfirm = async () => {
    if (!orderId) return
    try {
      await updateDoc(doc(db, 'orders', orderId), { paymentStatus: 'client_confirmed' })
    } catch (_) {}
    setShowPayModal(false)
    clearCart()
  }

  // Pantalla de confirmación
  if (orderId && !showPayModal) {
    const shortId = orderId.substring(0, 8).toUpperCase()
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <span className={styles.successIcon}>✅</span>
          <h2 className={styles.successTitle}>¡Pedido realizado!</h2>
          <p className={styles.successSub}>Tu pedido ha sido registrado correctamente</p>
          <div className={styles.orderIdBox}>
            <span className={styles.orderIdLabel}>Número de pedido</span>
            <span className={styles.orderIdValue}>#{shortId}</span>
          </div>
          <button className={styles.btnPrimary} onClick={() => navigate('/client/orders')}>
            Ver mis pedidos
          </button>
          <button className={styles.btnSecondary} onClick={() => navigate('/client/shop')}>
            Seguir comprando
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Checkout</h1>

      {/* Resumen */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Resumen del pedido</h2>
        <div className={styles.itemList}>
          {items.map(item => (
            <div key={item.productId} className={styles.orderItem}>
              <span className={styles.orderItemName}>{item.name} x{item.quantity}</span>
              <span className={styles.orderItemPrice}>{(item.price * item.quantity).toFixed(2)} €</span>
            </div>
          ))}
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalValue}>{totalPrice.toFixed(2)} €</span>
          </div>
        </div>
      </section>

      {/* Método de pago */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Método de pago</h2>
        <div className={styles.paymentGrid}>
          {PAYMENT_METHODS.map(m => (
            <button
              key={m.value}
              className={`${styles.paymentBtn} ${paymentMethod === m.value ? styles.paymentBtnActive : ''}`}
              onClick={() => setPaymentMethod(m.value)}
            >
              <span className={styles.paymentIcon}>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Notas */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notas (opcional)</h2>
        <textarea
          className={styles.textarea}
          placeholder="Instrucciones especiales, dirección de entrega..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.btnPrimary} onClick={handleOrder} disabled={loading}>
        {loading ? 'Procesando...' : `Confirmar pedido · ${totalPrice.toFixed(2)} €`}
      </button>

      {/* Modal instrucciones pago */}
      {showPayModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Pago con {paymentMethod === 'bizum' ? 'Bizum' : 'PayPal'}</h3>
            <p className={styles.modalText}>{PAYMENT_INSTRUCTIONS[paymentMethod]}</p>
            <p className={styles.modalAmount}>{totalPrice.toFixed(2)} €</p>
            <button className={styles.btnPrimary} onClick={handlePaymentConfirm}>
              Ya he pagado
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
