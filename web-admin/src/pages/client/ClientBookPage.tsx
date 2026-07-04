import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, getDocs, query, where, addDoc, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { getAllBarbershops } from '../../services/barbershops'
import { Barbershop, Service, User } from '../../types'
import styles from './ClientBookPage.module.css'

type Step = 1 | 2 | 3 | 4 | 5

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 9; h < 20; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

export default function ClientBookPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)

  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [selectedBarbershop, setSelectedBarbershop] = useState<Barbershop | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [barbers, setBarbers] = useState<User[]>([])
  const [selectedBarber, setSelectedBarber] = useState<User | null>(null)
  const [date, setDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [takenSlots, setTakenSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [appointmentId, setAppointmentId] = useState<string | null>(null)

  // Load barbershops
  useEffect(() => {
    getAllBarbershops().then(setBarbershops)
  }, [])

  // Load services when barbershop selected
  useEffect(() => {
    if (!selectedBarbershop) return
    setLoading(true)
    getDocs(
      query(collection(db, 'services'), where('barbershopId', '==', selectedBarbershop.id))
    ).then(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Service))
      // Also use inline services from barbershop
      const all = list.length > 0 ? list : (selectedBarbershop.services ?? [])
      setServices(all)
    }).finally(() => setLoading(false))
  }, [selectedBarbershop])

  // Load barbers when barbershop selected
  useEffect(() => {
    if (!selectedBarbershop) return
    getDocs(
      query(collection(db, 'users'),
        where('barbershopId', '==', selectedBarbershop.id),
        where('role', '==', 'barber'))
    ).then(snap => {
      setBarbers(snap.docs.map(d => ({ ...d.data() } as User)))
    })
  }, [selectedBarbershop])

  // Load taken slots when barber+date selected
  useEffect(() => {
    if (!selectedBarber || !date || !selectedBarbershop) return
    const start = new Date(date + 'T00:00:00')
    const end   = new Date(date + 'T23:59:59')
    getDocs(
      query(collection(db, 'appointments'),
        where('barberId', '==', selectedBarber.uid),
        where('barbershopId', '==', selectedBarbershop.id),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end))
      )
    ).then(snap => {
      const taken = snap.docs
        .map(d => d.data())
        .filter(d => d.status !== 'cancelled')
        .map(d => d.timeSlot as string)
      setTakenSlots(taken)
    })
  }, [selectedBarber, date, selectedBarbershop])

  const allSlots = generateTimeSlots()

  const handleConfirm = async () => {
    if (!user || !selectedBarbershop || !selectedService || !selectedBarber || !date || !selectedTime) return
    setSubmitting(true)
    setError('')
    try {
      const dateObj = new Date(date + 'T' + selectedTime + ':00')
      const ref = await addDoc(collection(db, 'appointments'), {
        clientId: user.uid,
        clientName: user.displayName,
        clientEmail: user.email,
        barbershopId: selectedBarbershop.id,
        barberId: selectedBarber.uid,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        serviceDuration: selectedService.duration,
        date: Timestamp.fromDate(dateObj),
        timeSlot: selectedTime,
        status: 'pending',
        createdAt: serverTimestamp(),
        services: [selectedService],
        totalPrice: selectedService.price,
      })
      setAppointmentId(ref.id)
    } catch (err: any) {
      setError('Error al reservar la cita. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // Success screen
  if (appointmentId) {
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <span className={styles.successIcon}>📅</span>
          <h2 className={styles.successTitle}>¡Cita reservada!</h2>
          <p className={styles.successSub}>Tu cita ha sido registrada correctamente</p>
          <div className={styles.summaryBox}>
            <div className={styles.summaryRow}><span>Servicio</span><span>{selectedService?.name}</span></div>
            <div className={styles.summaryRow}><span>Barbero</span><span>{selectedBarber?.displayName}</span></div>
            <div className={styles.summaryRow}><span>Fecha</span><span>{date}</span></div>
            <div className={styles.summaryRow}><span>Hora</span><span>{selectedTime}</span></div>
          </div>
          <button className={styles.btnPrimary} onClick={() => navigate('/client/appointments')}>
            Ver mis citas
          </button>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Reservar cita</h1>
        <div className={styles.steps}>
          {([1,2,3,4,5] as Step[]).map(s => (
            <div key={s} className={`${styles.stepDot} ${step >= s ? styles.stepDotActive : ''}`}>{s}</div>
          ))}
        </div>
      </div>

      {/* Paso 1: Barbería */}
      {step === 1 && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Selecciona la barbería</h2>
          <div className={styles.optionList}>
            {barbershops.map(b => (
              <button
                key={b.id}
                className={`${styles.optionBtn} ${selectedBarbershop?.id === b.id ? styles.optionBtnActive : ''}`}
                onClick={() => setSelectedBarbershop(b)}
              >
                <span className={styles.optionIcon}>🏪</span>
                <div>
                  <p className={styles.optionTitle}>{b.name}</p>
                  <p className={styles.optionSub}>{b.address}</p>
                </div>
              </button>
            ))}
          </div>
          <button className={styles.btnPrimary} disabled={!selectedBarbershop} onClick={() => setStep(2)}>
            Siguiente →
          </button>
        </div>
      )}

      {/* Paso 2: Servicio */}
      {step === 2 && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Selecciona el servicio</h2>
          {loading ? <p className={styles.muted}>Cargando...</p> : (
            <div className={styles.optionList}>
              {services.map(s => (
                <button
                  key={s.id}
                  className={`${styles.optionBtn} ${selectedService?.id === s.id ? styles.optionBtnActive : ''}`}
                  onClick={() => setSelectedService(s)}
                >
                  <span className={styles.optionIcon}>✂️</span>
                  <div>
                    <p className={styles.optionTitle}>{s.name}</p>
                    <p className={styles.optionSub}>{s.duration} min · {s.price.toFixed(2)} €</p>
                  </div>
                </button>
              ))}
              {services.length === 0 && <p className={styles.muted}>No hay servicios disponibles</p>}
            </div>
          )}
          <div className={styles.navBtns}>
            <button className={styles.btnSecondary} onClick={() => setStep(1)}>← Atrás</button>
            <button className={styles.btnPrimary} disabled={!selectedService} onClick={() => setStep(3)}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Paso 3: Barbero */}
      {step === 3 && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Selecciona el barbero</h2>
          <div className={styles.optionList}>
            {barbers.map(b => (
              <button
                key={b.uid}
                className={`${styles.optionBtn} ${selectedBarber?.uid === b.uid ? styles.optionBtnActive : ''}`}
                onClick={() => setSelectedBarber(b)}
              >
                <span className={styles.optionIcon}>💈</span>
                <div>
                  <p className={styles.optionTitle}>{b.displayName}</p>
                  {b.bio && <p className={styles.optionSub}>{b.bio}</p>}
                </div>
              </button>
            ))}
            {barbers.length === 0 && <p className={styles.muted}>No hay barberos disponibles</p>}
          </div>
          <div className={styles.navBtns}>
            <button className={styles.btnSecondary} onClick={() => setStep(2)}>← Atrás</button>
            <button className={styles.btnPrimary} disabled={!selectedBarber} onClick={() => setStep(4)}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Paso 4: Fecha y hora */}
      {step === 4 && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Selecciona fecha y hora</h2>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Fecha</label>
            <input
              type="date"
              className={styles.dateInput}
              value={date}
              min={today}
              onChange={e => { setDate(e.target.value); setSelectedTime('') }}
            />
          </div>
          {date && (
            <div className={styles.slotsSection}>
              <p className={styles.fieldLabel}>Hora disponible</p>
              <div className={styles.slotsGrid}>
                {allSlots.map(slot => {
                  const taken = takenSlots.includes(slot)
                  return (
                    <button
                      key={slot}
                      className={`${styles.slot} ${taken ? styles.slotTaken : ''} ${selectedTime === slot ? styles.slotActive : ''}`}
                      disabled={taken}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className={styles.navBtns}>
            <button className={styles.btnSecondary} onClick={() => setStep(3)}>← Atrás</button>
            <button className={styles.btnPrimary} disabled={!date || !selectedTime} onClick={() => setStep(5)}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Paso 5: Confirmar */}
      {step === 5 && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Confirmar cita</h2>
          <div className={styles.summaryBox}>
            <div className={styles.summaryRow}><span>Barbería</span><span>{selectedBarbershop?.name}</span></div>
            <div className={styles.summaryRow}><span>Servicio</span><span>{selectedService?.name}</span></div>
            <div className={styles.summaryRow}><span>Barbero</span><span>{selectedBarber?.displayName}</span></div>
            <div className={styles.summaryRow}><span>Fecha</span><span>{date}</span></div>
            <div className={styles.summaryRow}><span>Hora</span><span>{selectedTime}</span></div>
            <div className={styles.summaryRow}><span>Precio</span><span className={styles.price}>{selectedService?.price.toFixed(2)} €</span></div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.navBtns}>
            <button className={styles.btnSecondary} onClick={() => setStep(4)}>← Atrás</button>
            <button className={styles.btnPrimary} disabled={submitting} onClick={handleConfirm}>
              {submitting ? 'Reservando...' : 'Confirmar cita'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
