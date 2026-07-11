import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getBarberProfile } from '../../services/barberProfile'
import { getRecentBarberReviews } from '../../services/barberReviews'
import { BarberProfile, BarberReview } from '../../types'
import styles from './BarberProfileViewPage.module.css'

export default function BarberProfileViewPage() {
  const { barberId } = useParams<{ barberId: string }>()
  const [profile, setProfile] = useState<BarberProfile | null>(null)
  const [reviews, setReviews] = useState<BarberReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (!barberId) return
    loadProfile()
  }, [barberId])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const [profileData, reviewsData] = await Promise.all([
        getBarberProfile(barberId!),
        getRecentBarberReviews(barberId!, 10),
      ])

      if (!profileData) {
        setError('Perfil no encontrado')
        return
      }

      setProfile(profileData)
      setReviews(reviewsData)
    } catch (err) {
      console.error('[BARBER_PROFILE_VIEW] Error loading:', err)
      setError('Error al cargar el perfil')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className={styles.container}>Cargando perfil...</div>
  }

  if (error || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'Perfil no encontrado'}</div>
      </div>
    )
  }

  const stars = Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={styles.star}>
      {i < Math.floor(profile.ratings.averageRating) ? '⭐' : '☆'}
    </span>
  ))

  return (
    <div className={styles.container}>
      {/* Header con info básica */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <img
            src={profile.location.country ? '👤' : '👤'}
            alt="Avatar"
            className={styles.avatar}
          />
          <div>
            <h1>{profile.displayName}</h1>
            <p className={styles.location}>
              📍 {profile.location.city}, {profile.location.province}
            </p>
            <div className={styles.rating}>
              <div className={styles.stars}>{stars}</div>
              <span className={styles.ratingText}>
                {profile.ratings.averageRating.toFixed(1)} ({profile.ratings.totalReviews} reseñas)
              </span>
            </div>
          </div>
          <div className={styles.availability}>
            {profile.availability.status === 'available' ? (
              <div className={styles.availableBadge}>✅ Disponible</div>
            ) : profile.availability.status === 'in_negotiation' ? (
              <div className={styles.negotiatingBadge}>⏳ En negociación</div>
            ) : (
              <div className={styles.unavailableBadge}>❌ No disponible</div>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      <section className={styles.section}>
        <h2>Sobre mí</h2>
        <p className={styles.bio}>{profile.bio}</p>
      </section>

      {/* Experiencia */}
      <section className={styles.section}>
        <h2>Experiencia Profesional</h2>
        <div className={styles.professionalInfo}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Años de experiencia</span>
            <span className={styles.value}>{profile.professional.yearsExperience} años</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Especialidades</span>
            <div className={styles.specialties}>
              {profile.professional.specialties.map((spec, idx) => (
                <span key={idx} className={styles.specialty}>
                  {spec}
                </span>
              ))}
            </div>
          </div>
          {profile.professional.languages.length > 0 && (
            <div className={styles.infoItem}>
              <span className={styles.label}>Idiomas</span>
              <div className={styles.languages}>
                {profile.professional.languages.map((lang, idx) => (
                  <span key={idx} className={styles.language}>
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile.professional.certifications && profile.professional.certifications.length > 0 && (
            <div className={styles.infoItem}>
              <span className={styles.label}>Certificaciones</span>
              <ul>
                {profile.professional.certifications.map((cert, idx) => (
                  <li key={idx}>{cert}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Portfolio */}
      {profile.portfolio.photos.length > 0 && (
        <section className={styles.section}>
          <h2>Portfolio ({profile.portfolio.photos.length} fotos)</h2>
          <div className={styles.gallery}>
            {profile.portfolio.photos.map((photo) => (
              <div
                key={photo.id}
                className={styles.photoCard}
                onClick={() => setSelectedPhoto(photo.url)}
              >
                <img src={photo.url} alt={photo.caption} className={styles.photoThumbnail} />
                {photo.caption && (
                  <p className={styles.photoCaption}>{photo.caption}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reseñas */}
      <section className={styles.section}>
        <h2>Reseñas ({profile.ratings.totalReviews})</h2>
        {reviews.length > 0 ? (
          <div className={styles.reviews}>
            {reviews.map((review) => (
              <div key={review.id} className={styles.reviewCard}>
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
          <p className={styles.noReviews}>Sin reseñas aún</p>
        )}
      </section>

      {/* Instagram */}
      {profile.social.instagramUrl && (
        <section className={styles.section}>
          <h2>Redes Sociales</h2>
          <a href={profile.social.instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.instagramLink}>
            📷 {profile.social.instagramHandle || 'Ver en Instagram'}
          </a>
        </section>
      )}

      {/* Modal de foto ampliada */}
      {selectedPhoto && (
        <div className={styles.photoModal} onClick={() => setSelectedPhoto(null)}>
          <div className={styles.photoModalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.photoModalClose}
              onClick={() => setSelectedPhoto(null)}
            >
              ✕
            </button>
            <img src={selectedPhoto} alt="Ampliada" className={styles.photoModalImage} />
          </div>
        </div>
      )}
    </div>
  )
}
