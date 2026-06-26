import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllBarbershops, deleteBarbershop } from '../../services/barbershops'
import { Barbershop } from '../../types'
import styles from './BarbershopsPage.module.css'

export default function BarbershopsPage() {
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    const data = await getAllBarbershops()
    setBarbershops(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la barbería "${name}"? Esta acción no se puede deshacer.`)) return
    await deleteBarbershop(id)
    await load()
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Barberías</h1>
          <p className={styles.sub}>{barbershops.length} barberías registradas en la plataforma</p>
        </div>
        <button className={styles.addBtn} onClick={() => navigate('/barbershops/new')}>
          + Nueva barbería
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : barbershops.length === 0 ? (
        <div className={styles.empty}>
          <span>🏪</span>
          <p>No hay barberías registradas aún</p>
          <button className={styles.addBtn} onClick={() => navigate('/barbershops/new')}>
            Crear la primera
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {barbershops.map(shop => (
            <div key={shop.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.shopIcon}>✂️</div>
                <div className={styles.cardActions}>
                  <button className={styles.editBtn} onClick={() => navigate(`/barbershops/${shop.id}`)}>
                    Editar
                  </button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(shop.id, shop.name)}>
                    Eliminar
                  </button>
                </div>
              </div>
              <h3 className={styles.shopName}>{shop.name}</h3>
              <p className={styles.shopInfo}>📍 {shop.address}</p>
              <p className={styles.shopInfo}>📞 {shop.phone}</p>
              <div className={styles.stats}>
                <span>{shop.barbers?.length ?? 0} barberos</span>
                <span>•</span>
                <span>{shop.services?.length ?? 0} servicios</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
