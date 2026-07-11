import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  getBarberProfile,
  uploadPortfolioPhoto,
  deletePortfolioPhoto,
  updatePhotoCaption,
} from '../../services/barberProfile'
import { BarberProfilePhoto } from '../../types'
import UploadFotoModal from '../../components/barber/UploadFotoModal'
import styles from './PortfolioPage.module.css'

export default function PortfolioPage() {
  const { user } = useAuth()
  const [photos, setPhotos] = useState<BarberProfilePhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null)
  const [editingCaption, setEditingCaption] = useState('')

  useEffect(() => {
    if (!user?.uid) return
    loadProfile()
  }, [user?.uid])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const data = await getBarberProfile(user!.uid)
      if (data) {
        setPhotos(data.portfolio.photos)
      }
    } catch (err) {
      console.error('[PORTFOLIO] Error loading profile:', err)
      setError('Error al cargar el portfolio')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadPhoto = async (file: File, caption: string) => {
    if (!user?.uid) return

    try {
      setUploading(true)
      setError('')
      const newPhoto = await uploadPortfolioPhoto(user.uid, file, caption)
      setPhotos([...photos, newPhoto])
      setShowUploadModal(false)
    } catch (err: any) {
      console.error('[PORTFOLIO] Error uploading photo:', err)
      setError(err.message || 'Error al subir la foto')
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!user?.uid || !window.confirm('¿Borrar esta foto?')) return

    try {
      await deletePortfolioPhoto(user.uid, photoId)
      setPhotos(photos.filter((p) => p.id !== photoId))
    } catch (err: any) {
      console.error('[PORTFOLIO] Error deleting photo:', err)
      setError(err.message || 'Error al borrar la foto')
    }
  }

  const handleSaveCaption = async (photoId: string) => {
    if (!user?.uid) return

    try {
      await updatePhotoCaption(user.uid, photoId, editingCaption)
      setPhotos(
        photos.map((p) => (p.id === photoId ? { ...p, caption: editingCaption } : p))
      )
      setEditingPhotoId(null)
      setEditingCaption('')
    } catch (err: any) {
      console.error('[PORTFOLIO] Error saving caption:', err)
      setError(err.message || 'Error al guardar la descripción')
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando portfolio...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📸 Mi Portfolio</h1>
        <p>Sube fotos de tu trabajo para que los dueños vean tu talento</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{photos.length}</span>
          <span className={styles.statLabel}>Fotos subidas</span>
        </div>
      </div>

      <button
        onClick={() => setShowUploadModal(true)}
        className={styles.uploadButton}
        disabled={uploading}
      >
        ➕ {uploading ? 'Subiendo...' : 'Agregar Foto'}
      </button>

      {photos.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📸</div>
          <h2>Sin fotos aún</h2>
          <p>Comienza a subir fotos de tu trabajo para que otros te descubran</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className={styles.emptyButton}
            disabled={uploading}
          >
            Subir primera foto →
          </button>
        </div>
      ) : (
        <div className={styles.gallery}>
          {photos.map((photo) => (
            <div key={photo.id} className={styles.photoCard}>
              <div className={styles.photoImageWrapper}>
                <img src={photo.url} alt="Portfolio" className={styles.photoImage} />
                <div className={styles.photoOverlay}>
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className={styles.deleteBtn}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className={styles.photoInfo}>
                {editingPhotoId === photo.id ? (
                  <div className={styles.editCaption}>
                    <textarea
                      value={editingCaption}
                      onChange={(e) => setEditingCaption(e.target.value)}
                      placeholder="Describe la foto (ej: Corte clásico con líneas)"
                      maxLength={150}
                    />
                    <div className={styles.editButtons}>
                      <button
                        onClick={() => handleSaveCaption(photo.id)}
                        className={styles.saveCaptionBtn}
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setEditingPhotoId(null)
                          setEditingCaption('')
                        }}
                        className={styles.cancelCaptionBtn}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setEditingPhotoId(photo.id)
                      setEditingCaption(photo.caption || '')
                    }}
                    className={styles.captionView}
                  >
                    <p className={styles.caption}>
                      {photo.caption || '(sin descripción)'}
                    </p>
                    <button className={styles.editBtn}>✏️</button>
                  </div>
                )}
                <p className={styles.uploadedAt}>
                  {new Date(photo.uploadedAt).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUploadModal && (
        <UploadFotoModal
          onUpload={handleUploadPhoto}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  )
}
