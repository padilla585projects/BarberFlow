import { useEffect, useState } from 'react'
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './NotificationsPage.module.css'

interface Notification {
  id: string
  type: 'appointment' | 'review' | 'loyalty' | 'summary' | 'message'
  title: string
  body: string
  read: boolean
  createdAt: Date
}

const TYPE_ICONS: Record<string, string> = {
  appointment: '\u{1F4C5}',
  review: '⭐',
  loyalty: '\u{1F381}',
  summary: '\u{1F4CA}',
  message: '\u{1F4AC}',
}

function timeAgo(date: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'Ahora mismo'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} d`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          type: data.type ?? 'message',
          title: data.title ?? '',
          body: data.body ?? '',
          read: data.read ?? false,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
        } as Notification
      })
      setNotifications(items)
      setLoading(false)
    })
    return unsub
  }, [user?.uid])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (id: string) => {
    if (!user?.uid) return
    await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true })
  }

  const markAllRead = async () => {
    if (!user?.uid) return
    const batch = writeBatch(db)
    notifications
      .filter(n => !n.read)
      .forEach(n => {
        batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true })
      })
    await batch.commit()
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Notificaciones</h1>
          <p className={styles.sub}>
            {notifications.length} notificaciones{unreadCount > 0 ? ` · ${unreadCount} sin leer` : ''}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.markAllBtn}
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Marcar todo como leído
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>
          <span>{'\u{1F514}'}</span>
          <p>No hay notificaciones todavía</p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map(n => (
            <div
              key={n.id}
              className={`${styles.notification} ${!n.read ? styles.unread : ''}`}
              onClick={() => !n.read && markAsRead(n.id)}
            >
              <div className={styles.icon}>
                {TYPE_ICONS[n.type] ?? '\u{1F514}'}
              </div>
              <div className={styles.content}>
                <div className={styles.title}>{n.title}</div>
                <div className={styles.body}>{n.body}</div>
                <div className={styles.time}>{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read && <div className={styles.unreadDot} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
