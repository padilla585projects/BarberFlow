import { useEffect, useState } from 'react'
import { getReviewsByBarbershop, deleteReview } from '../../services/reviews'
import { getAllBarbershops } from '../../services/barbershops'
import { useAuth } from '../../contexts/AuthContext'
import { Review, Barbershop } from '../../types'
import styles from './ReviewsPage.module.css'

export default function ReviewsPage() {
  const { user } = useAuth()
  const [reviews, setReviews]         = useState<Review[]>([])
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [loading, setLoading]         = useState(true)
  const [filterRating, setFilterRating] = useState(0)

  const load = async (shopId: string) => {
    if (!shopId) return
    setLoading(true)
    const data = await getReviewsByBarbershop(shopId)
    setReviews(data)
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

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta reseña?')) return
    await deleteReview(id)
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  const filtered = filterRating === 0 ? reviews : reviews.filter(r => r.rating === filterRating)

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—'

  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round(reviews.filter(r => r.rating === star).length / reviews.length * 100) : 0,
  }))

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Reseñas</h1>
          <p className={styles.sub}>{reviews.length} reseñas · {barbershops.find(b => b.id === selectedShop)?.name}</p>
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

      <div className={styles.overview}>
        <div className={styles.avgBox}>
          <span className={styles.avgNumber}>{avgRating}</span>
          <div className={styles.stars}>{'★'.repeat(Math.round(Number(avgRating) || 0))}{'☆'.repeat(5 - Math.round(Number(avgRating) || 0))}</div>
          <span className={styles.avgLabel}>{reviews.length} reseñas</span>
        </div>
        <div className={styles.distribution}>
          {distribution.map(d => (
            <div key={d.star} className={styles.distRow} onClick={() => setFilterRating(filterRating === d.star ? 0 : d.star)}>
              <span className={styles.distStar}>{d.star}★</span>
              <div className={styles.distBar}>
                <div className={styles.distFill} style={{ width: `${d.pct}%` }} />
              </div>
              <span className={styles.distCount}>{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {filterRating > 0 && (
        <div className={styles.activeFilter}>
          Mostrando solo {filterRating}★
          <button onClick={() => setFilterRating(0)}>✕ Quitar filtro</button>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>⭐</span>
          <p>No hay reseñas{filterRating > 0 ? ` de ${filterRating} estrella${filterRating > 1 ? 's' : ''}` : ''}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(review => (
            <div key={review.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.clientInfo}>
                  <div className={styles.avatar}>{review.clientName[0]?.toUpperCase()}</div>
                  <div>
                    <p className={styles.clientName}>{review.clientName}</p>
                    <p className={styles.barberName}>con {review.barberName}</p>
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <div className={styles.rating}>
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                  <span className={styles.date}>
                    {review.createdAt instanceof Date
                      ? review.createdAt.toLocaleDateString('es-ES')
                      : new Date((review.createdAt as any).seconds * 1000).toLocaleDateString('es-ES')}
                  </span>
                  {(user?.role === 'owner' || user?.role === 'developer') && (
                    <button className={styles.deleteBtn} onClick={() => handleDelete(review.id)}>✕</button>
                  )}
                </div>
              </div>
              {review.comment && (
                <p className={styles.comment}>"{review.comment}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
