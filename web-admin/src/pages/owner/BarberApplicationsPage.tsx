import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, setDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './BarberApplicationsPage.module.css'

interface Application {
  id: string
  userId: string
  userName: string
  userEmail: string
  userPhoto?: string
  barbershopId: string
  barbershopName: string
  message: string
  status: 'pending' | 'approved' | 'rejected'
  invitationCode?: string
  createdAt: Timestamp
  reviewedAt?: Timestamp
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateCode(): string {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

export default function BarberApplicationsPage() {
  const { user } = useAuth()
  const barbershopId = user?.barbershopId
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    if (!barbershopId) return
    const q = query(
      collection(db, 'barber_applications'),
      where('barbershopId', '==', barbershopId),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Application)))
      setLoading(false)
    })
    return unsub
  }, [barbershopId])

  const handleApprove = async (app: Application) => {
    setProcessingId(app.id)
    try {
      const code = generateCode()
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72h

      // Create invitation in Firestore (same structure JoinBarbershopScreen expects)
      await setDoc(doc(db, 'invitations', code), {
        barbershopId: app.barbershopId,
        barbershopName: app.barbershopName,
        createdBy: 'owner',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        used: false,
        applicationId: app.id,
        applicantUserId: app.userId,
      })

      // Update application status
      await updateDoc(doc(db, 'barber_applications', app.id), {
        status: 'approved',
        invitationCode: code,
        reviewedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error approving application:', err)
      alert('Error al aprobar la solicitud')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (app: Application) => {
    if (!confirm(`¿Rechazar la solicitud de ${app.userName}?`)) return
    setProcessingId(app.id)
    try {
      await updateDoc(doc(db, 'barber_applications', app.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error rejecting application:', err)
      alert('Error al rechazar la solicitud')
    } finally {
      setProcessingId(null)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)
  const pendingCount = applications.filter(a => a.status === 'pending').length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Solicitudes de barberos</h1>
          <p className={styles.subtitle}>
            Gestiona las solicitudes para unirse a tu barbería
          </p>
        </div>
        {pendingCount > 0 && (
          <span className={styles.badge}>{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobadas' : f === 'rejected' ? 'Rechazadas' : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>✂️</span>
          <p>{filter === 'pending' ? 'No hay solicitudes pendientes' : 'No hay solicitudes en esta categoría'}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(app => (
            <div key={app.id} className={`${styles.card} ${styles[`card_${app.status}`]}`}>
              {/* Applicant info */}
              <div className={styles.applicant}>
                {app.userPhoto ? (
                  <img src={app.userPhoto} alt={app.userName} className={styles.avatar} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {(app.userName?.[0] ?? '?').toUpperCase()}
                  </div>
                )}
                <div className={styles.applicantInfo}>
                  <span className={styles.applicantName}>{app.userName || 'Sin nombre'}</span>
                  <span className={styles.applicantEmail}>{app.userEmail}</span>
                  <span className={styles.date}>
                    {app.createdAt?.toDate().toLocaleDateString('es-ES', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <span className={`${styles.statusBadge} ${styles[`status_${app.status}`]}`}>
                  {app.status === 'pending' ? 'Pendiente' : app.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                </span>
              </div>

              {/* Message */}
              {app.message && (
                <div className={styles.message}>
                  <span className={styles.messageLabel}>Mensaje:</span>
                  <p className={styles.messageText}>"{app.message}"</p>
                </div>
              )}

              {/* Invitation code (if approved) */}
              {app.status === 'approved' && app.invitationCode && (
                <div className={styles.codeBox}>
                  <span className={styles.codeLabel}>Código de verificación para el barbero:</span>
                  <div className={styles.codeRow}>
                    <span className={styles.code}>{app.invitationCode}</span>
                    <button
                      className={styles.copyBtn}
                      onClick={() => copyCode(app.invitationCode!)}
                    >
                      {copiedCode === app.invitationCode ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className={styles.codeHint}>
                    Comparte este código con {app.userName}. Lo introduce en la app en "Unirse a barbería". Válido 72 horas.
                  </p>
                </div>
              )}

              {/* Actions */}
              {app.status === 'pending' && (
                <div className={styles.actions}>
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleApprove(app)}
                    disabled={processingId === app.id}
                  >
                    {processingId === app.id ? 'Procesando...' : '✓ Aprobar y generar código'}
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleReject(app)}
                    disabled={processingId === app.id}
                  >
                    ✕ Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
