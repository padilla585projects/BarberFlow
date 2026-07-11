import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getBarberProfile } from '../../services/barberProfile'
import { getRecentBarberReviews } from '../../services/barberReviews'
import { updateAvailabilityStatus } from '../../services/barberProfile'
import { BarberProfile, BarberReview } from '../../types'
import styles from './DashboardBarber.module.css'

export default function DashboardBarber() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<BarberProfile | null>(null)
  const [reviews, setReviews] = useState<BarberReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    loadData()
  }, [user?.uid])

  const loadData = async () => {
    try {
      setLoading(true)
      const [profileData, reviewsData] = await Promise.all([
        getBarberProfile(user!.uid),
        getRecentBarberReviews(user!.uid, 5),
      ])

      if (profileData) {
        setProfile(profileData)
        setReviews(reviewsData)
      } else {
        setError('Perfil no encontrado. Por favor, crea tu perfil primero.')
      }
    } catch (err) {
      console.error('[DASHBOARD_BARBER] Error loading data:', err)
      setError('Error al cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAvailability = async () => {
    if (!user?.uid || !profile) return

    setUpdatingStatus(true)
    try {
      const newStatus = profile.availability.status === 'available' ? 'unavailable' : 'available'
      await updateAvailabilityStatus(user.uid, newStatus)
      setProfile({
        ...profile,
        availability: {
          ...profile.availability,
          status: newStatus,
          updatedAt: new Date(),
        },
      })
    } catch (err) {
      console.error('[DASHBOARD_BARBER] Error updating availability:', err)
      setError('Error al actualizar disponibilidad')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando tu dashboard...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={() => navigate('/onboarding/crear-perfil-barbero')} className={styles.createProfileBtn}>
          Crear Perfil →
        </button>
      </div>
    )
  }

  const averageRating = profile.ratings.averageRating.toFixed(1)
  const isAvailable = profile.availability.status === 'available'

  return (
    <div className={styles.container}>
      {/* Header con bienvenida */}
      <div className={styles.header}>
        <div className={styles.greeting}>
          <h1>👋 Bienvenido, {profile.displayName}</h1>
          <p className={styles.subtitle}>
            {profile.location.city}, {profile.location.province}
          </p>
        </div>

        {/* Disponibilidad grande */}
        <div className={styles.availabilityCard}>
          <div className={styles.availabilityContent}>
            <p className={styles.availabilityLabel}>Estado de Disponibilidad</p>
            <p className={styles.availabilityStatus}>
              {isAvailable ? '✅ Disponible para Trabajar' : '❌ No Disponible'}
            </p>
          </div>
          <button
            onClick={handleToggleAvailability}
            disabled={updatingStatus}
            className={`${styles.availabilityToggle} ${isAvailable ? styles.availableBtn : styles.unavailableBtn}`}
          >
            {updatingStatus ? 'Actualizando...' : isAvailable ? 'Cambiar a No Disponible' : 'Marcar Disponible'}
          </button>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Fotos de Portfolio</p>
          <p className={styles.statValue}>{profile.portfolio.photos.length}</p>
          <button
            onClick={() => navigate('/portfolio')}
            className={styles.statAction}
          >
            Ver Portfolio →
          </button>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Calificación</p>
          <p className={styles.statValue}>⭐ {averageRating}</p>
          <p className={styles.statMeta}>{profile.ratings.totalReviews} reseñas</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Experiencia</p>
          <p className={styles.statValue}>{profile.professional.yearsExperience} años</p>
          <button
            onClick={() => navigate(`/barber-profile/${user?.uid}`)}
            className={styles.statAction}
          >
            Ver Mi Perfil →
          </button>
        </div>
      </div>

      {/* Sección de Perfil */}
      <section className={styles.section}>
        <h2>Mi Perfil</h2>
        <div className={styles.profileGrid}>
          <div className={styles.profileItem}>
            <span className={styles.profileLabel}>Email</span>
            <span className={styles.profileValue}>{user?.email}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.profileLabel}>Teléfono</span>
            <span className={styles.profileValue}>{profile.phone}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.profileLabel}>Especialidades</span>
            <div className={styles.specialties}>
              {profile.professional.specialties.map((spec, idx) => (
                <span key={idx} className={styles.specialty}>
                  {spec}
                </span>
              ))}
            </div>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.profileLabel}>Idiomas</span>
            <div className={styles.languages}>
              {profile.professional.languages.map((lang, idx) => (
                <span key={idx} className={styles.language}>
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/onboarding/crear-perfil-barbero')} className={styles.editProfileBtn}>
          ✏️ Editar Perfil
        </button>
      </section>

      {/* Sección de Reseñas */}
      <section className={styles.section}>
        <h2>Reseñas Recientes</h2>
        {reviews.length > 0 ? (
          <div className={styles.reviewsList}>
            {reviews.map((review) => (
              <div key={review.id} className={styles.reviewItem}>
                <div className={styles.reviewHeader}>
                  <div className={styles.reviewStars}>
                    {Array.from({ length: review.rating }, (_, i) => (
                      <span key={i}>⭐</span>
                    ))}
                  </div>
                  <span className={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <p className={styles.reviewComment}>{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noReviews}>
            Sin reseñas aún. ¡Cuando empieces a trabajar comenzarán a llegar! 📈
          </p>
        )}
      </section>

      {/* Sección de Instagram */}
      {profile.social.instagramUrl && (
        <section className={styles.section}>
          <h2>Conectado a Redes Sociales</h2>
          <a
            href={profile.social.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.instagramLink}
          >
            📷 {profile.social.instagramHandle || 'Ver en Instagram'}
          </a>
        </section>
      )}

      {/* Quick Links */}
      <div className={styles.quickLinks}>
        <button
          onClick={() => navigate('/appointments')}
          className={styles.quickLink}
        >
          📅 Citas
        </button>
        <button
          onClick={() => navigate('/messages')}
          className={styles.quickLink}
        >
          💬 Mensajes
        </button>
        <button
          onClick={() => navigate('/sales')}
          className={styles.quickLink}
        >
          💰 Ventas
        </button>
      </div>

      {error && <div className={styles.errorBar}>{error}</div>}
    </div>
  )
}
