import { useState, useRef } from 'react'
import styles from './UploadFotoModal.module.css'

interface UploadFotoModalProps {
  onUpload: (file: File, caption: string) => Promise<void>
  onClose: () => void
}

export default function UploadFotoModal({ onUpload, onClose }: UploadFotoModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes (JPG, PNG, WebP)')
      return
    }

    // Validar tamaño (máx 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('La imagen no debe superar 50 MB')
      return
    }

    setSelectedFile(file)

    // Crear preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setError('')
    setUploading(true)

    try {
      await onUpload(selectedFile, caption.trim())
    } catch (err: any) {
      setError(err.message || 'Error al subir la foto')
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    if (!uploading) {
      onClose()
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Subir Foto del Portfolio</h2>
          <button
            onClick={handleCancel}
            className={styles.closeBtn}
            disabled={uploading}
          >
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {!preview ? (
            <div
              className={styles.dropZone}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const files = e.dataTransfer.files
                if (files.length > 0) {
                  handleFileSelect({ target: { files } } as any)
                }
              }}
            >
              <div className={styles.dropZoneIcon}>📸</div>
              <p>Arrastra tu foto aquí o haz click para seleccionar</p>
              <p className={styles.dropZoneHint}>JPG, PNG, WebP (máx 50 MB)</p>
            </div>
          ) : (
            <div className={styles.preview}>
              <img src={preview} alt="Preview" className={styles.previewImage} />
              <button
                onClick={() => {
                  setPreview(null)
                  setSelectedFile(null)
                  setCaption('')
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className={styles.changeBtn}
                disabled={uploading}
              >
                Cambiar foto
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div className={styles.captionField}>
            <label>Descripción (opcional)</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ej: Corte clásico con líneas limpias. Cliente satisfecho ✂️"
              maxLength={150}
              disabled={uploading || !selectedFile}
              rows={3}
            />
            <p className={styles.charCount}>{caption.length}/150</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button
            onClick={handleCancel}
            className={styles.btnSecondary}
            disabled={uploading}
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            className={styles.btnPrimary}
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Subiendo...' : 'Subir Foto'}
          </button>
        </div>
      </div>
    </div>
  )
}
