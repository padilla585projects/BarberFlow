import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  doc, getDoc, updateDoc,
  collection, query, where, getDocs,
  addDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { getAllBarbershops } from '../../services/barbershops'
import { Barbershop } from '../../types'
import styles from './OnboardingPage.module.css'

type Tab = 'code' | 'apply'

export default function OnboardingBarberPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('code')

  // ── Código de invitación ──
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')

  // ── Solicitar unirse ──
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedShop, setSelectedShop] = useState('')
  const [message, setMessage] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applySuccess, setApplySuccess] = useState(false)

  // ── Solicitud pendiente existente ──
  const [hasPending, setHasPending] = useState(false)
  const [checkingPending, setCheckingPending] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    const init = async () => {
      try {
        const [shops, pendingSnap] = await Promise.all([
          getAllBarbershops(),
          getDocs(query(
            collection(db, 'barber_applications'),
            where('userId', '==', user.uid),
            where('status', '==', 'pending'),
          )),
        ])
        setBarbershops(shops)
        setHasPending(!pendingSnap.empty)
      } finally {
        setCheckingPending(false)
      }
    }
    init()
  }, [user?.uid])

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !code.trim()) return

    setCodeLoading(true)
    setCodeError('')
    try {
      const invRef = doc(db, 'invitations', code.trim().toUpperCase())
      const invSnap = await getDoc(invRef)

      if (!invSnap.exists()) {
        setCodeError('Código no encontrado. Comprueba que está escrito correctamente.')
        setCodeLoading(false)
        return
      }

      const inv = invSnap.data()
      if (inv.used) {
        setCodeError('Este código ya ha sido usado.')
        setCodeLoading(false)
        return
      }
      if (new Date(inv.expiresAt) < new Date()) {
        setCodeError('Este código ha caducado. Pide uno nuevo al dueño.')
        setCodeLoading(false)
        return
      }

      // Marcar código usado + asignar barbería al usuario
      await Promise.all([
        updateDoc(invRef, {
          used: true,
          usedBy: user.uid,
          usedAt: new Date().toISOString(),
        }),
        updateDoc(doc(db, 'users', user.uid), {
          barbershopId: inv.barbershopId,
          role: 'barber',
        }),
      ])

      await refreshUser()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error(err)
      setCodeError('Error al validar el código. Inténtalo de nuevo.')
      setCodeLoading(false)
    }
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedShop) return

    setApplyLoading(true)
    setApplyError('')
    try {
      const shop = barbershops.find(s => s.id === selectedShop)
      await addDoc(collection(db, 'barber_applications'), {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        userPhoto: user.photoURL ?? null,
        barbershopId: selectedShop,
        barbershopName: shop?.name ?? '',
        message: message.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setApplySuccess(true)
      setHasPending(true)
    } catch (err) {
      console.error(err)
      setApplyError('Error al enviar la solicitud. Inténtalo de nuevo.')
    } finally {
      setApplyLoading(false)
    }
  }

  if (checkingPending) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  // ── Estado: tiene solicitud pendiente ──
  if (hasPending) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.icon}>⏳</div>
          <h1 className={styles.title}>Solicitud enviada</h1>
          <p className={styles.subtitle}>
            Tu solicitud está siendo revisada por el dueño de la barbería.
            Cuando sea aceptada recibirás un código de invitación.
          </p>

          <div className={styles.pendingNote}>
            Una vez tengas el código, introdúcelo aquí para activar tu cuenta:
          </div>

          <form onSubmit={handleCode} className={styles.form}>
            <div className={styles.field}>
              <label>Código de invitación (6 caracteres)</label>
              <input
                type="text"
                placeholder="XXXXXX"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className={styles.codeInput}
                autoFocus
              />
            </div>
            {codeError && <p className={styles.error}>{codeError}</p>}
            <button
              type="submit"
              className={styles.btn}
              disabled={codeLoading || code.length < 6}
            >
              {codeLoading ? 'Verificando...' : 'Activar cuenta →'}
            </button>
          </form>

          <button onClick={logout} className={styles.logoutLink}>
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  // ── Estado normal: elegir entre código o solicitud ──
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>✂️</div>
        <h1 className={styles.title}>Únete a una barbería</h1>
        <p className={styles.subtitle}>
          Usa el código que te dio el dueño o envía una solicitud.
        </p>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'code' ? styles.tabActive : ''}`}
            onClick={() => setTab('code')}
          >
            🔑 Tengo un código
          </button>
          <button
            className={`${styles.tab} ${tab === 'apply' ? styles.tabActive : ''}`}
            onClick={() => setTab('apply')}
          >
            📋 Solicitar unirse
          </button>
        </div>

        {/* ── Tab: Código ── */}
        {tab === 'code' && (
          <form onSubmit={handleCode} className={styles.form}>
            <div className={styles.field}>
              <label>Código de invitación (6 caracteres)</label>
              <input
                type="text"
                placeholder="Ej: ABC12X"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className={styles.codeInput}
                autoFocus
              />
            </div>
            {codeError && <p className={styles.error}>{codeError}</p>}
            <button
              type="submit"
              className={styles.btn}
              disabled={codeLoading || code.length < 6}
            >
              {codeLoading ? 'Verificando...' : 'Unirme →'}
            </button>
          </form>
        )}

        {/* ── Tab: Solicitar ── */}
        {tab === 'apply' && (
          applySuccess ? (
            <div className={styles.successMsg}>
              <strong>✅ Solicitud enviada</strong><br />
              El dueño la revisará y te enviará un código de invitación si acepta tu solicitud.
              Cuando lo tengas, vuelve aquí e introdúcelo.
            </div>
          ) : (
            <form onSubmit={handleApply} className={styles.form}>
              <div className={styles.field}>
                <label>Elige la barbería a la que quieres unirte *</label>
                <select
                  value={selectedShop}
                  onChange={e => setSelectedShop(e.target.value)}
                  required
                >
                  <option value="">-- Selecciona una barbería --</option>
                  {barbershops.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.address}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Mensaje al dueño (opcional)</label>
                <textarea
                  placeholder="Cuéntale tu experiencia como barbero..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
              {applyError && <p className={styles.error}>{applyError}</p>}
              <button
                type="submit"
                className={styles.btn}
                disabled={applyLoading || !selectedShop}
              >
                {applyLoading ? 'Enviando...' : 'Enviar solicitud →'}
              </button>
            </form>
          )
        )}

        <button onClick={logout} className={styles.logoutLink}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
