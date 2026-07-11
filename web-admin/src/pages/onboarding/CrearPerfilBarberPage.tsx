import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { createBarberProfile, updateBarberProfile, getBarberProfile } from '../../services/barberProfile'
import { BarberProfile } from '../../types'
import styles from './OnboardingPage.module.css'

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7

export default function CrearPerfilBarberPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Datos básicos
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [country, setCountry] = useState('')

  // Step 2: Profesional
  const [yearsExperience, setYearsExperience] = useState<number | ''>('')
  const [specialties, setSpecialties] = useState<string>('') // texto separado por comas
  const [certifications, setCertifications] = useState<string>('')
  const [languages, setLanguages] = useState<string>('') // texto separado por comas

  // Step 3: Redes sociales
  const [instagramHandle, setInstagramHandle] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')

  // Step 4: Bio
  const [bio, setBio] = useState('')

  // Step 5: Avatar (foto de perfil) - en Fase 1 se saltará, lo hacemos después
  // Por ahora solo foto de User

  // Step 6: Disponibilidad
  const [availability, setAvailability] = useState<'available' | 'unavailable'>('unavailable')

  const handleNext = async () => {
    setError('')

    // Validaciones por paso
    if (step === 1) {
      if (!displayName.trim()) {
        setError('Escribe tu nombre completo')
        return
      }
      if (!phone.trim()) {
        setError('Escribe tu teléfono')
        return
      }
      if (!city.trim() || !province.trim()) {
        setError('Indica tu ciudad y provincia')
        return
      }
    }

    if (step === 2) {
      if (yearsExperience === '' || Number(yearsExperience) < 0) {
        setError('Indica años de experiencia')
        return
      }
      if (!specialties.trim()) {
        setError('Agrégale al menos una especialidad')
        return
      }
      if (!languages.trim()) {
        setError('Agrégale al menos un idioma')
        return
      }
    }

    if (step === 3) {
      if (instagramHandle.trim() && !instagramUrl.trim()) {
        setError('Si indicas handle, también ingresa la URL')
        return
      }
    }

    if (step === 4) {
      if (!bio.trim()) {
        setError('Escribe una pequeña biografía')
        return
      }
    }

    // Pasar al siguiente paso
    if (step < 7) {
      setStep((step + 1) as Step)
    }
  }

  const handlePrevious = () => {
    if (step > 1) {
      setStep((step - 1) as Step)
    }
  }

  const handleSave = async () => {
    if (!user?.uid) return

    setLoading(true)
    setError('')

    try {
      const profileData: Partial<BarberProfile> = {
        displayName: displayName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        location: {
          city: city.trim(),
          province: province.trim(),
          country: country.trim() || undefined,
        },
        professional: {
          yearsExperience: Number(yearsExperience),
          specialties: specialties
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s),
          certifications: certifications
            .split(',')
            .map((c) => c.trim())
            .filter((c) => c),
          languages: languages
            .split(',')
            .map((l) => l.trim())
            .filter((l) => l),
        },
        social: {
          instagramHandle: instagramHandle.trim() || undefined,
          instagramUrl: instagramUrl.trim() || undefined,
        },
        availability: {
          status: availability,
          updatedAt: new Date(),
        },
      }

      // Verificar si el perfil ya existe
      const existingProfile = await getBarberProfile(user.uid)

      if (existingProfile) {
        // Actualizar
        await updateBarberProfile(user.uid, profileData)
        console.log('[CREAR_PERFIL] Profile updated')
      } else {
        // Crear
        await createBarberProfile(user.uid, profileData)
        console.log('[CREAR_PERFIL] Profile created')
      }

      // Navegar al dashboard
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      console.error('[CREAR_PERFIL] Error:', err)
      setError(err.message || 'Error al guardar el perfil')
      setLoading(false)
    }
  }

  const progressPercent = (step / 7) * 100

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Crea tu Perfil de Barbero</h1>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>
          <p className={styles.subtitle}>Paso {step} de 7</p>
        </div>

        <div className={styles.content}>
          {/* PASO 1: Datos básicos */}
          {step === 1 && (
            <>
              <h2 className={styles.stepTitle}>Datos Básicos</h2>

              <div className={styles.field}>
                <label>Nombre completo *</label>
                <input
                  type="text"
                  placeholder="Juan García"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <label>Teléfono *</label>
                <input
                  type="tel"
                  placeholder="+34 600 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Ciudad *</label>
                  <input
                    type="text"
                    placeholder="Madrid"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label>Provincia *</label>
                  <input
                    type="text"
                    placeholder="Madrid"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>País (opcional)</label>
                <input
                  type="text"
                  placeholder="España"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </>
          )}

          {/* PASO 2: Profesional */}
          {step === 2 && (
            <>
              <h2 className={styles.stepTitle}>Experiencia Profesional</h2>

              <div className={styles.field}>
                <label>Años de experiencia *</label>
                <input
                  type="number"
                  placeholder="5"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value === '' ? '' : Number(e.target.value))}
                  min="0"
                />
              </div>

              <div className={styles.field}>
                <label>Especialidades * (separadas por comas)</label>
                <textarea
                  placeholder="Ej: Cortes clásicos, Diseños modernos, Afeitados"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  rows={3}
                />
              </div>

              <div className={styles.field}>
                <label>Certificaciones (opcional, separadas por comas)</label>
                <textarea
                  placeholder="Ej: Barbería Clásica, Cortes con Navaja"
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  rows={2}
                />
              </div>

              <div className={styles.field}>
                <label>Idiomas * (separados por comas)</label>
                <textarea
                  placeholder="Ej: Español, Inglés"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          {/* PASO 3: Redes sociales */}
          {step === 3 && (
            <>
              <h2 className={styles.stepTitle}>Redes Sociales</h2>
              <p className={styles.stepSubtitle}>Enlaza tu Instagram para que los clientes vean tu trabajo</p>

              <div className={styles.field}>
                <label>Handle de Instagram (opcional)</label>
                <input
                  type="text"
                  placeholder="@tu_usuario"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label>URL de Instagram (opcional)</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/tu_usuario"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                />
              </div>
            </>
          )}

          {/* PASO 4: Bio */}
          {step === 4 && (
            <>
              <h2 className={styles.stepTitle}>Sobre Ti</h2>

              <div className={styles.field}>
                <label>Biografía * (Cuéntales tu historia)</label>
                <textarea
                  placeholder="Soy un barbero con pasión por los cortes clásicos y modernos. Me encanta hacer que mis clientes se sientan cómodos..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                />
              </div>
            </>
          )}

          {/* PASO 5: Avatar (saltado por ahora, se puede hacer después) */}
          {step === 5 && (
            <>
              <h2 className={styles.stepTitle}>Foto de Perfil</h2>
              <p className={styles.stepSubtitle}>Tu foto de perfil está lista (usa la de tu cuenta actual)</p>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
                Podrás cambiarla luego desde tu panel
              </p>
            </>
          )}

          {/* PASO 6: Disponibilidad */}
          {step === 6 && (
            <>
              <h2 className={styles.stepTitle}>Disponibilidad</h2>

              <div className={styles.field}>
                <label>¿Quieres estar disponible para nuevas ofertas de trabajo? *</label>
                <div className={styles.toggleGroup}>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${availability === 'available' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setAvailability('available')}
                  >
                    ✅ Disponible
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${availability === 'unavailable' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setAvailability('unavailable')}
                  >
                    ❌ No disponible
                  </button>
                </div>
                <p className={styles.fieldHint}>
                  Podrás cambiar esto cuando quieras desde tu panel
                </p>
              </div>
            </>
          )}

          {/* PASO 7: Resumen */}
          {step === 7 && (
            <>
              <h2 className={styles.stepTitle}>Resumen de tu Perfil</h2>

              <div className={styles.summary}>
                <div className={styles.summarySection}>
                  <h3>Datos Personales</h3>
                  <p><strong>{displayName}</strong></p>
                  <p>{phone}</p>
                  <p>{city}, {province}</p>
                </div>

                <div className={styles.summarySection}>
                  <h3>Experiencia</h3>
                  <p>{yearsExperience} años de experiencia</p>
                  <p><strong>Especialidades:</strong> {specialties}</p>
                  {languages && <p><strong>Idiomas:</strong> {languages}</p>}
                </div>

                <div className={styles.summarySection}>
                  <h3>Biografía</h3>
                  <p>{bio}</p>
                </div>

                {instagramHandle && (
                  <div className={styles.summarySection}>
                    <h3>Instagram</h3>
                    <p>{instagramHandle}</p>
                  </div>
                )}

                <div className={styles.summarySection}>
                  <h3>Estado</h3>
                  <p>{availability === 'available' ? '✅ Disponible para trabajar' : '❌ No disponible aún'}</p>
                </div>
              </div>

              <p className={styles.fieldHint} style={{ marginTop: '1.5rem' }}>
                ✨ ¡Perfil listo! Ahora podrás subir fotos de tu trabajo y gestionar tu perfil desde tu panel.
              </p>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handlePrevious}
            disabled={step === 1 || loading}
          >
            ← Anterior
          </button>

          {step < 7 ? (
            <button
              type="button"
              className={styles.btn}
              onClick={handleNext}
              disabled={loading}
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              className={styles.btn}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Perfil ✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
