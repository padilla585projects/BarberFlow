import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { getAllBarbershops } from '../../services/barbershops'
import { useAuth } from '../../contexts/AuthContext'
import { Barbershop } from '../../types'
import styles from './GiftCardsPage.module.css'

interface GiftCard {
  id: string
  code: string
  amount: number
  balance: number
  purchasedBy: string
  purchasedByName: string
  barbershopId: string
  barbershopName: string
  recipientName?: string
  personalMessage?: string
  paymentMethod: string
  status: 'active' | 'used'
  createdAt: any
}

type Filter = 'all' | 'active' | 'used'

const PAYMENT_LABEL: Record<string, string> = {
  cash: '💵 Efectivo',
  bizum: '📱 Bizum',
  paypal: '🅿️ PayPal',
}

function fmtDate(val: any): string {
  if (!val) return '—'
  const d = val?.toDate ? val.toDate() : new Date(val)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function GiftCardsPage() {
  const { user } = useAuth()
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [cards, setCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    try {
      const q = query(
        collection(db, 'giftCards'),
        where('barbershopId', '==', shopId),
        orderBy('createdAt', 'desc'),
      )
      const snap = await getDocs(q)
      setCards(snap.docs.map(d => ({ id: d.id, ...d.data() } as GiftCard)))
    } catch (err) {
      console.error('[GiftCardsPage]', err)
    } finally {
      setLoading(false)
    }
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

  const filtered = cards.filter(c => filter === 'all' || c.status === filter)

  const totalActive  = cards.filter(c => c.status === 'active').length
  const totalUsed    = cards.filter(c => c.status === 'used').length
  const totalIssued  = cards.reduce((s, c) => s + c.amount, 0)
  const totalBalance = cards.filter(c => c.status === 'active').reduce((s, c) => s + c.balance, 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>🎁 Tarjetas regalo</h1>
          <p className={styles.sub}>Gestión de gift cards emitidas</p>
        </div>
        <div className={styles.headerRight}>
          {barbershops.length > 1 && (
            <select
              className={styles.shopSelect}
              value={selectedShop}
              onChange={e => { setSelectedShop(e.target.value); load(e.target.value) }}
            >
              {barbershops.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalActive}</span>
          <span className={styles.statLabel}>Activas</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalUsed}</span>
          <span className={styles.statLabel}>Usadas</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalIssued.toFixed(0)} €</span>
          <span className={styles.statLabel}>Total emitido</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalBalance.toFixed(0)} €</span>
          <span className={styles.statLabel}>Saldo pendiente</span>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {(['all', 'active', 'used'] as Filter[]).map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todas' : f === 'active' ? '🟢 Activas' : '✅ Usadas'}
            <span className={styles.filterCount}>
              {f === 'all' ? cards.length : cards.filter(c => c.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className={styles.loading}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🎁</span>
          <p>No hay tarjetas regalo {filter !== 'all' ? `con estado "${filter}"` : ''}</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Importe</th>
                <th>Saldo</th>
                <th>Comprador</th>
                <th>Destinatario</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(card => {
                const pct = Math.round((card.balance / card.amount) * 100)
                return (
                  <tr key={card.id}>
                    <td>
                      <span className={styles.code}>{card.code}</span>
                    </td>
                    <td className={styles.amount}>{card.amount.toFixed(0)} €</td>
                    <td>
                      <div className={styles.balanceCell}>
                        <span className={styles.balanceValue}>{card.balance.toFixed(0)} €</span>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={styles.buyer}>{card.purchasedByName || '—'}</td>
                    <td className={styles.recipient}>{card.recipientName || '—'}</td>
                    <td>{PAYMENT_LABEL[card.paymentMethod] ?? card.paymentMethod}</td>
                    <td>
                      <span className={`${styles.badge} ${card.status === 'active' ? styles.badgeActive : styles.badgeUsed}`}>
                        {card.status === 'active' ? '🟢 Activa' : '✅ Usada'}
                      </span>
                    </td>
                    <td className={styles.date}>{fmtDate(card.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
