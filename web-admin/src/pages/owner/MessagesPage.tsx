import { useEffect, useState, useRef } from 'react'
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { getAllBarbershops } from '../../services/barbershops'
import { getUsersByBarbershop } from '../../services/users'
import { Barbershop, User } from '../../types'
import styles from './MessagesPage.module.css'

interface Message {
  id: string
  senderId: string
  senderName: string
  recipientId: string
  text: string
  createdAt: Date
}

export default function MessagesPage() {
  const { user } = useAuth()
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [barbers, setBarbers] = useState<User[]>([])
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load barbershops and barbers
  useEffect(() => {
    const init = async () => {
      const shops = await getAllBarbershops()
      setBarbershops(shops)
      const shopId = user?.barbershopId ?? shops[0]?.id ?? ''
      setSelectedShop(shopId)
      if (shopId) {
        const users = await getUsersByBarbershop(shopId)
        const bs = users.filter(u => u.uid !== user?.uid && (u.role === 'barber' || u.role === 'owner'))
        setBarbers(bs)
      }
      setLoading(false)
    }
    init()
  }, [])

  // Listen to messages for selected barber
  useEffect(() => {
    if (!selectedShop || !selectedBarber || !user?.uid) {
      setMessages([])
      return
    }

    const messagesRef = collection(db, 'barbershops', selectedShop, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => {
          const data = d.data()
          return {
            id: d.id,
            senderId: data.senderId ?? '',
            senderName: data.senderName ?? '',
            recipientId: data.recipientId ?? '',
            text: data.text ?? '',
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
          } as Message
        })
        .filter(m => {
          // Show messages between current user and selected barber, or broadcast messages
          return (
            m.recipientId === 'all' ||
            (m.senderId === user.uid && m.recipientId === selectedBarber) ||
            (m.senderId === selectedBarber && m.recipientId === user.uid)
          )
        })
      setMessages(items)
    })
    return unsub
  }, [selectedShop, selectedBarber, user?.uid])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (broadcast = false) => {
    if (!text.trim() || !selectedShop || !user?.uid) return
    if (!broadcast && !selectedBarber) return

    setSending(true)
    await addDoc(collection(db, 'barbershops', selectedShop, 'messages'), {
      senderId: user.uid,
      senderName: user.displayName ?? 'Admin',
      recipientId: broadcast ? 'all' : selectedBarber,
      text: text.trim(),
      createdAt: serverTimestamp(),
    })
    setText('')
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const formatDate = (date: Date) =>
    date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  const getBarberInitials = (name: string) => {
    const parts = name.split(' ')
    return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)
  }

  const roleLabel: Record<string, string> = {
    barber: 'Barbero',
    owner: 'Dueño',
    developer: 'Developer',
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Mensajes</h1>
          <p className={styles.sub}>
            Comunicación interna · {barbers.length} barbero{barbers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {user?.role === 'developer' && (
          <select
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: '#fff', padding: '10px 14px', borderRadius: 'var(--radius)',
              fontSize: '13px', fontFamily: 'inherit',
            }}
            value={selectedShop}
            onChange={async (e) => {
              const shopId = e.target.value
              setSelectedShop(shopId)
              setSelectedBarber(null)
              setLoading(true)
              const users = await getUsersByBarbershop(shopId)
              const bs = users.filter(u => u.uid !== user?.uid && (u.role === 'barber' || u.role === 'owner'))
              setBarbers(bs)
              setLoading(false)
            }}
          >
            {barbershops.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : (
        <div className={styles.container}>
          {/* Left — contacts */}
          <div className={styles.contacts}>
            <div className={styles.contactsTitle}>Barberos</div>
            <div className={styles.contactsList}>
              {barbers.length === 0 && (
                <div style={{ padding: '20px', color: '#555', fontSize: '13px', textAlign: 'center' }}>
                  No hay barberos en esta barbería
                </div>
              )}
              {barbers.map(b => (
                <div
                  key={b.uid}
                  className={`${styles.contact} ${selectedBarber === b.uid ? styles.contactActive : ''}`}
                  onClick={() => setSelectedBarber(b.uid)}
                >
                  {b.photoURL ? (
                    <img src={b.photoURL} alt="" className={styles.contactAvatarImg} />
                  ) : (
                    <div className={styles.contactAvatar}>
                      {getBarberInitials(b.displayName)}
                    </div>
                  )}
                  <div>
                    <div className={styles.contactName}>{b.displayName}</div>
                    <div className={styles.contactRole}>{roleLabel[b.role] ?? b.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — chat */}
          <div className={styles.chat}>
            {!selectedBarber ? (
              <div className={styles.chatEmpty}>
                <span>{'\u{1F4AC}'}</span>
                <p>Selecciona un barbero para iniciar la conversación</p>
              </div>
            ) : (
              <>
                <div className={styles.chatHeader}>
                  <div className={styles.chatHeaderInfo}>
                    <div className={styles.chatHeaderName}>
                      {barbers.find(b => b.uid === selectedBarber)?.displayName ?? 'Barbero'}
                    </div>
                  </div>
                  <button
                    className={styles.broadcastBtn}
                    onClick={() => handleSend(true)}
                    disabled={!text.trim() || sending}
                  >
                    Enviar a todos
                  </button>
                </div>

                <div className={styles.messages}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#555', padding: '40px 0', fontSize: '13px' }}>
                      No hay mensajes todavía. Envía el primero.
                    </div>
                  )}
                  {messages.map(m => {
                    const isOwn = m.senderId === user?.uid
                    const isBroadcast = m.recipientId === 'all'

                    return (
                      <div
                        key={m.id}
                        className={`${styles.message} ${
                          isBroadcast
                            ? styles.messageBroadcast
                            : isOwn
                              ? styles.messageOwn
                              : styles.messageOther
                        }`}
                      >
                        {isBroadcast && (
                          <div className={styles.broadcastLabel}>Mensaje a todos</div>
                        )}
                        <div className={`${styles.messageSender} ${isOwn ? styles.messageOwnSender : ''}`}>
                          {m.senderName}
                        </div>
                        <div>{m.text}</div>
                        <div className={styles.messageTime}>
                          {formatDate(m.createdAt)} · {formatTime(m.createdAt)}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className={styles.inputBar}>
                  <textarea
                    className={styles.inputField}
                    placeholder="Escribe un mensaje..."
                    rows={1}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    className={styles.sendBtn}
                    onClick={() => handleSend()}
                    disabled={!text.trim() || sending}
                  >
                    {sending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
