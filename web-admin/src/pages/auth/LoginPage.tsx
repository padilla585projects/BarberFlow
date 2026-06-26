import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './LoginPage.module.css'

type Method = 'google' | 'email'
type Mode = 'login' | 'register' | 'forgot'

function getFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found':       'No existe cuenta con ese email',
    'auth/wrong-password':       'Contraseña incorrecta',
    'auth/invalid-credential':   'Email o contraseña incorrectos',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email',
    'auth/weak-password':        'La contraseña debe tener al menos 6 caracteres',
    'auth/invalid-email':        'El email no es válido',
    'auth/too-many-requests':    'Demasiados intentos. Prueba en unos minutos',
    'auth/network-request-failed': 'Sin conexión. Comprueba tu red',
  }
  return map[code] ?? 'Error al iniciar sesión. Inténtalo de nuevo.'
}

export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail, resetPassword } = useAuth()

  const [method, setMethod] = useState<Method>('google')
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const reset = () => {
    setError('')
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  const switchMethod = (m: Method) => { setMethod(m); reset(); setResetSent(false) }
  const switchMode = (m: Mode) => { setMode(m); reset(); setResetSent(false) }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      await loginWithGoogle()
    } catch {
      setError('Error al conectar con Google. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'forgot') {
      setLoading(true)
      try {
        await resetPassword(email)
        setResetSent(true)
      } catch (err: any) {
        setError(getFirebaseError(err?.code ?? ''))
      } finally {
        setLoading(false)
      }
      return
    }

    if (mode === 'register') {
      if (!name.trim()) { setError('Escribe tu nombre'); return }
      if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return }
      if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password)
      } else {
        await signUpWithEmail(name.trim(), email, password)
      }
    } catch (err: any) {
      setError(getFirebaseError(err?.code ?? ''))
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* Lado izquierdo — branding */}
      <div className={styles.brand}>
        <div className={styles.brandBg} />
        <div className={styles.brandTop}>
          <span className={styles.brandScissors}>✂️</span>
          <span className={styles.brandTopName}>BarberFlow</span>
        </div>

        <div className={styles.brandCenter}>
          <h1 className={styles.brandTagline}>
            Gestión<br />
            <span>sin</span><br />
            límites
          </h1>
          <p className={styles.brandSub}>
            La plataforma completa para barberías modernas. Reservas, barberos, inventario y reportes en un solo lugar.
          </p>
        </div>

        <div className={styles.brandBottom}>
          <div className={styles.stat}>
            <p className={styles.statValue}>100%</p>
            <p className={styles.statLabel}>Control</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statValue}>∞</p>
            <p className={styles.statLabel}>Barberías</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statValue}>24/7</p>
            <p className={styles.statLabel}>Disponible</p>
          </div>
        </div>
      </div>

      {/* Lado derecho — form */}
      <div className={styles.formSide}>
        <div className={styles.card}>
          <h2 className={styles.heading}>
            {mode === 'register' ? 'Crear cuenta' : mode === 'forgot' ? 'Recuperar cuenta' : 'Bienvenido'}
          </h2>
          <p className={styles.subtitle}>
            {mode === 'register'
              ? 'Rellena los datos para registrarte'
              : mode === 'forgot'
              ? 'Te enviaremos un enlace para restablecer tu contraseña'
              : 'Accede a tu panel de BarberFlow'}
          </p>

          {/* Selector de método — oculto en modo forgot */}
          <div className={styles.methodTabs} style={{ display: mode === 'forgot' ? 'none' : undefined }}>
            <button
              className={`${styles.methodTab} ${method === 'google' ? styles.methodTabActive : ''}`}
              onClick={() => switchMethod('google')}
            >
              <GoogleIcon /> Google
            </button>
            <button
              className={`${styles.methodTab} ${method === 'email' ? styles.methodTabActive : ''}`}
              onClick={() => switchMethod('email')}
            >
              ✉️ Email y contraseña
            </button>
          </div>

          {/* Google */}
          {method === 'google' && (
            <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
              <GoogleIcon />
              {loading ? 'Redirigiendo...' : 'Continuar con Google'}
            </button>
          )}

          {/* Email / contraseña */}
          {(method === 'email' || mode === 'forgot') && (
            <form className={styles.emailForm} onSubmit={handleEmailSubmit}>

              {/* ── Recuperar contraseña ── */}
              {mode === 'forgot' && (
                resetSent ? (
                  <div className={styles.resetSuccess}>
                    <span>✉️</span>
                    <div>
                      <p><strong>Email enviado</strong></p>
                      <p>Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue el enlace para restablecer tu contraseña.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.field}>
                      <label>Tu email</label>
                      <input type="email" placeholder="tu@email.com" value={email}
                        onChange={e => setEmail(e.target.value)} autoFocus required />
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={loading || !email.trim()}>
                      {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </button>
                  </>
                )
              )}
              {mode === 'forgot' && (
                <button type="button" className={styles.switchMode} onClick={() => switchMode('login')}>
                  ← Volver al inicio de sesión
                </button>
              )}

              {/* ── Login / Register fields ── */}
              {mode !== 'forgot' && (<>
                {mode === 'register' && (
                  <div className={styles.field}>
                    <label>Nombre completo</label>
                    <input type="text" placeholder="Juan García" value={name}
                      onChange={e => setName(e.target.value)} autoComplete="name" required />
                  </div>
                )}

                <div className={styles.field}>
                  <label>Email</label>
                  <input type="email" placeholder="tu@email.com" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" required />
                </div>

                <div className={styles.field}>
                  <label>Contraseña</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      required
                    />
                    <button type="button" className={styles.eyeBtn}
                      onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className={styles.field}>
                    <label>Confirmar contraseña</label>
                    <input type={showPassword ? 'text' : 'password'} placeholder="Repite la contraseña"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password" required />
                  </div>
                )}

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading
                    ? (mode === 'register' ? 'Creando cuenta...' : 'Entrando...')
                    : (mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión')}
                </button>

                <div className={styles.formLinks}>
                  <button type="button" className={styles.switchMode}
                    onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
                    {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                  </button>
                  {mode === 'login' && (
                    <button type="button" className={styles.forgotLink}
                      onClick={() => switchMode('forgot')}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
              </>)}
            </form>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <p className={styles.footer}>
            Acceso para barberos, dueños y administradores.<br />
            ¿Eres cliente? Usa la app móvil BarberFlow.
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
