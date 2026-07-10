# Sistema de Citas para Barberos - Documentación

## Overview

Se ha implementado un sistema completo de gestión de citas para barberos, permitiéndoles ver todas sus citas próximas, marcarlas como completadas o cancelarlas.

## Archivos Creados

### 1. `mobile/src/services/appointmentService.ts`

Servicio de capa de datos que proporciona funciones para interactuar con Firestore.

**Funciones principales:**

#### `getBarberoAppointments(barberId, barbershopId, statuses)`
- Obtiene todas las citas del barbero
- Parámetros:
  - `barberId`: UID del barbero
  - `barbershopId`: ID de la barbería
  - `statuses`: Array de estados a filtrar (default: `['pending', 'confirmed']`)
- Retorna: Array de `Appointment` ordenados por fecha ascendente

#### `subscribeToBarberoAppointments(barberId, barbershopId, statuses, onUpdate)`
- Suscripción en tiempo real a cambios de citas
- Parámetros:
  - `barberId`: UID del barbero
  - `barbershopId`: ID de la barbería
  - `statuses`: Array de estados a filtrar
  - `onUpdate`: Callback que se ejecuta cuando los datos cambian
- Retorna: Función para desuscribirse

#### `updateAppointmentStatus(appointmentId, newStatus)`
- Actualiza el estado de una cita
- Parámetros:
  - `appointmentId`: ID de la cita
  - `newStatus`: Nuevo estado (`'pending'`, `'confirmed'`, `'completed'`, `'cancelled'`, `'no_show'`)

#### `completeAppointment(appointmentId)`
- Marca una cita como completada
- Registra la hora de finalización (`completedAt`)

#### `cancelAppointment(appointmentId, reason?)`
- Cancela una cita
- Parámetros:
  - `appointmentId`: ID de la cita
  - `reason`: Motivo de cancelación (opcional, default: "Cancelada por el barbero")
- Registra `cancelledAt` y `cancelReason`

#### `getBarberoAppointmentsByDateRange(barberId, barbershopId, startDate, endDate, statuses)`
- Obtiene citas dentro de un rango de fechas
- Útil para reportes o vistas filtradas

### 2. `mobile/src/components/AppointmentList.tsx`

Componente React Native que renderiza la lista de citas del barbero.

**Props:**
```typescript
interface AppointmentListProps {
  barberId: string;
  barbershopId: string;
  onStatusChange?: () => void;
}
```

**Características:**

- **Lista de citas próximas**
  - Ordenadas por fecha ascendente
  - Muestra solo citas pending y confirmed
  
- **Información por cita**
  - Hora de la cita (`timeSlot`)
  - Nombre del servicio
  - Fecha en formato corto (ej: "mié 10 jul")
  - Duración total del servicio
  - Precio total
  - Estado de la cita (con badge de color)

- **Acciones disponibles**
  - Botón "Completar": marca la cita como completada
  - Botón "Cancelar": cancela la cita
  - Confirmación mediante Alert antes de cualquier acción

- **Estados visuales**
  - Badge de color según estado:
    - Confirmed: Verde (success)
    - Pending: Naranja (warning)
    - Completed: Azul (info)
    - Cancelled: Rojo (error)

- **Funcionalidades adicionales**
  - Pull-to-refresh
  - Estado vacío personalizado
  - Loading indicator durante operaciones
  - Manejo de errores con Alert

**Estructura visual:**
```
[Appointment Card]
├── Header
│   ├── Time (10:00)
│   └── Status Badge (Confirmed)
├── Content
│   ├── Service Name (Corte de cabello)
│   ├── Date & Duration (mié 10 jul • 30 min)
│   └── Price (€15.00)
└── Actions (if pending/confirmed)
    ├── Complete Button
    └── Cancel Button
```

### 3. Actualización: `mobile/src/screens/barber/BarberHomeScreen.tsx`

Se ha actualizado el dashboard del barbero para incluir acceso al componente AppointmentList.

**Cambios:**
1. Importa `AppointmentList` desde componentes
2. Agrega estado `showAppointmentList` para mostrar/ocultar el componente
3. Implementa pantalla alternativa con AppointmentList en fullscreen
4. Agrega botón "Ver todas mis citas" que abre AppointmentList
5. Mantiene botón existente "Ver mi agenda"

**Navegación:**
- Click en "Ver todas mis citas" → Muestra AppointmentList completo
- Click en "Atrás" dentro de AppointmentList → Regresa al dashboard

## Estructura de Datos en Firestore

### Colección: `appointments`

Cada documento representa una cita y contiene:

```typescript
{
  id: string;                          // ID del documento
  barberId: string;                    // UID del barbero
  clientId: string;                    // UID del cliente
  barbershopId: string;                // ID de la barbería
  clientName?: string;                 // Nombre del cliente
  barbershopName?: string;             // Nombre de la barbería
  services: Service[];                 // Array de servicios
  date: Timestamp;                     // Fecha/hora de la cita
  timeSlot: string;                    // Hora en formato "HH:MM"
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  totalPrice: number;                  // Precio total
  paymentMethod?: 'cash' | 'bizum' | 'paypal';
  paymentStatus?: 'pending' | 'client_confirmed' | 'confirmed' | 'paid';
  createdAt: Timestamp;                // Fecha de creación
  
  // Agregados por appointmentService:
  completedAt?: Timestamp;             // Cuando se marcó como completada
  cancelledAt?: Timestamp;             // Cuando se canceló
  cancelReason?: string;               // Motivo de cancelación
  updatedAt?: Timestamp;               // Última actualización
}
```

### Service Structure
```typescript
{
  id: string;
  name: string;                        // Nombre del servicio
  duration: number;                    // Duración en minutos
  price: number;                       // Precio unitario
  description?: string;
}
```

## Flujos de Usuario

### Flujo 1: Ver todas mis citas
1. Barbero en Dashboard → Click "Ver todas mis citas"
2. Se abre lista fullscreen de AppointmentList
3. Muestra todas las citas pending y confirmed
4. Ordenadas por fecha (próximas primero)

### Flujo 2: Completar una cita
1. Barbero en AppointmentList
2. Click botón "Completar" en tarjeta de cita
3. Alert de confirmación aparece
4. Click "Completar" en alert
5. Estado actualizado a "completed"
6. Cita desaparece de la lista
7. Callback `onStatusChange` se ejecuta (refresh)

### Flujo 3: Cancelar una cita
1. Barbero en AppointmentList
2. Click botón "Cancelar" en tarjeta de cita
3. Alert de confirmación aparece
4. Click "Cancelar cita" en alert
5. Estado actualizado a "cancelled"
6. Cita desaparece de la lista
7. Callback `onStatusChange` se ejecuta (refresh)

### Flujo 4: Volver al dashboard
1. Barbero en AppointmentList
2. Click botón "← Atrás"
3. Regresa a pantalla principal (BarberHomeScreen)
4. Datos de dashboard se actualizan con nueva información

## Características de Suscripción en Tiempo Real

El componente usa `subscribeToBarberoAppointments()` que:

1. **Conecta con Firestore** en tiempo real
2. **Maneja múltiples statuses** mediante múltiples queries consolidadas
3. **Ordena automáticamente** por fecha
4. **Se desuscribe automáticamente** cuando el componente se desmonta
5. **Refesca datos** cuando se completa o cancela una cita

## Colores y Temas

Los colores se aplican según el tema de la barbería (`useBarberTheme()`):

- **Primary**: Color principal de la app
- **Success**: Verde para citas confirmadas
- **Warning**: Naranja para citas pending
- **Info**: Azul para citas completadas
- **Error**: Rojo para citas canceladas
- **Text**: Color del texto principal
- **TextSecondary**: Color del texto secundario
- **TextTertiary**: Color del texto terciario

## Integración con AuthContext

El componente utiliza:
- `useAuthContext()` para obtener `activeBarbershopId`
- `auth.currentUser` para obtener `barberId`

Estos datos se pasan al `AppointmentList` para filtrar citas correctamente.

## Manejo de Errores

### En appointmentService:
- Try-catch en cada función
- Logs en consola con prefijo `[appointmentService]`
- Throws error para manejo en componente

### En AppointmentList:
- Alert.alert() para mostrar errores al usuario
- Try-catch en funciones de completar/cancelar
- Loading state (`processingId`) evita acciones duplicadas
- Disabled buttons durante procesamiento

## Testing Manual

### Prerrequisitos:
1. Usuario autenticado como barbero
2. Barbería seleccionada (activeBarbershopId)
3. Citas existentes en Firestore para ese barbero

### Pasos:
1. Navega a BarberHomeScreen
2. Click en "Ver todas mis citas"
3. Verifica que se muestran citas
4. Click "Completar" en una cita
5. Confirma la acción
6. Verifica que desaparece de la lista
7. Click "Atrás"
8. Verifica que datos se actualizaron en dashboard

## Notas Técnicas

### Performance:
- Queries filtradas por barberId + barbershopId + status
- Índices Firestore recomendados:
  ```
  appointments: (barberId, barbershopId, status, date)
  ```

### Escalabilidad:
- Función `getBarberoAppointmentsByDateRange()` permite pagination futura
- Real-time subscriptions adapta automáticamente a cambios

### Tipado TypeScript:
- Todo el código está tipado con `Appointment` type
- Funciones de servicio tienen tipos de retorno explícitos
- Props del componente están tipadas con interfaces

## Próximas Mejoras Potenciales

1. Agregar filtros por estado
2. Agregar búsqueda por nombre de cliente
3. Agregar pagination/infinite scroll para muchas citas
4. Agregar razón de cancelación personalizada
5. Mostrar ganancia acumulada por citas completadas
6. Historial de citas completadas
7. Notificaciones para próximas citas

## Archivos Modificados

- `mobile/src/screens/barber/BarberHomeScreen.tsx`: Agregado AppointmentList y botones de navegación

## Archivos Creados

- `mobile/src/services/appointmentService.ts`: 234 líneas
- `mobile/src/components/AppointmentList.tsx`: 375 líneas
