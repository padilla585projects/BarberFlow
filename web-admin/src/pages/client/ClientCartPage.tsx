import { useNavigate } from 'react-router-dom'
import { useWebCart } from '../../contexts/WebCartContext'
import styles from './ClientCartPage.module.css'

export default function ClientCartPage() {
  const navigate = useNavigate()
  const { items, totalPrice, removeItem, updateQuantity, clearCart } = useWebCart()

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Carrito</h1>
        <div className={styles.empty}>
          <span>🛒</span>
          <p>Tu carrito está vacío</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/client/shop')}>
            Ir a la tienda
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Carrito</h1>
        <button className={styles.clearBtn} onClick={clearCart}>Vaciar</button>
      </div>

      <div className={styles.list}>
        {items.map(item => (
          <div key={item.productId} className={styles.item}>
            <div className={styles.itemInfo}>
              <p className={styles.itemName}>{item.name}</p>
              <p className={styles.itemPrice}>{item.price.toFixed(2)} € / ud.</p>
            </div>
            <div className={styles.itemControls}>
              <button
                className={styles.qtyBtn}
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              >-</button>
              <span className={styles.qty}>{item.quantity}</span>
              <button
                className={styles.qtyBtn}
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                disabled={item.quantity >= item.maxStock}
              >+</button>
            </div>
            <div className={styles.itemRight}>
              <p className={styles.itemSubtotal}>{(item.price * item.quantity).toFixed(2)} €</p>
              <button className={styles.removeBtn} onClick={() => removeItem(item.productId)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Total</span>
          <span className={styles.totalValue}>{totalPrice.toFixed(2)} €</span>
        </div>
        <button className={styles.btnPrimary} onClick={() => navigate('/client/checkout')}>
          Ir al checkout →
        </button>
      </div>
    </div>
  )
}
