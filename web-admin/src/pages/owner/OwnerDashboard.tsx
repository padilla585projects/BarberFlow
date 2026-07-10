import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getBarbershopById } from '../../services/barbershops'
import { getUsersByBarbershop } from '../../services/users'
import { getAppointmentsByBarbershop } from '../../services/appointments'
import { getSalesByBarbershop } from '../../services/sales'
import { Barbershop, User, Appointment, Sale } from '../../types'
import Overview from '../../components/owner/Overview'
import BarbershopSettings from '../../components/owner/BarbershopSettings'
import EmployeeManagement from '../../components/owner/EmployeeManagement'
import ServiceManagement from '../../components/owner/ServiceManagement'
import AnalyticsPage from '../../components/owner/AnalyticsPage'
import styles from './OwnerDashboard.module.css'

type TabType = 'overview' | 'settings' | 'employees' | 'services' | 'analytics'

export default function OwnerDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null)
  const [barbers, setBarbers] = useState<User[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        let barbershopId = user?.barbershopId ?? ''

        if (!barbershopId) {
          setError('No se encontró una barbería asociada')
          setLoading(false)
          return
        }

        const [shop, users, apps, salesData] = await Promise.all([
          getBarbershopById(barbershopId),
          getUsersByBarbershop(barbershopId),
          getAppointmentsByBarbershop(barbershopId),
          getSalesByBarbershop(barbershopId),
        ])

        setBarbershop(shop)
        setBarbers(users.filter(u => u.role === 'barber' || u.role === 'owner'))
        setAppointments(apps || [])
        setSales(salesData || [])
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError('Error al cargar los datos del dashboard')
      } finally {
        setLoading(false)
      }
    }

    if (user?.uid) {
      loadData()
    }
  }, [user?.uid, user?.barbershopId])

  const handleBarbershopUpdate = (updated: Barbershop) => {
    setBarbershop(updated)
  }

  const handleBarberUpdate = (updated: User[]) => {
    setBarbers(updated)
  }

  if (loading) {
    return <div className={styles.loading}>Cargando datos...</div>
  }

  if (error || !barbershop) {
    return <div className={styles.emptyState}><p>{error || 'Error al cargar los datos'}</p></div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Admin Panel</h1>
          <p>{barbershop.name}</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Resumen
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Configuración
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'employees' ? styles.active : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          Barberos
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'services' ? styles.active : ''}`}
          onClick={() => setActiveTab('services')}
        >
          Servicios
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'analytics' ? styles.active : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Análisis
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'overview' && (
          <Overview
            barbershop={barbershop}
            barbers={barbers}
            appointments={appointments}
            sales={sales}
          />
        )}
        {activeTab === 'settings' && (
          <BarbershopSettings
            barbershop={barbershop}
            onUpdate={handleBarbershopUpdate}
          />
        )}
        {activeTab === 'employees' && (
          <EmployeeManagement
            barbershopId={barbershop.id}
            barbers={barbers}
            onUpdate={handleBarberUpdate}
          />
        )}
        {activeTab === 'services' && (
          <ServiceManagement
            barbershop={barbershop}
            onUpdate={handleBarbershopUpdate}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsPage
            appointments={appointments}
            sales={sales}
            barbers={barbers}
          />
        )}
      </div>
    </div>
  )
}
