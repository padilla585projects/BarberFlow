# 🎨 FASE 2: Rediseño + Completar App Barbero

## Objetivo
Transformar la app del barbero de **fea y incompleta** a **profesional, completa y funcional**.

---

## 📊 Estado Actual (Malo)
- ❌ "Mi Agenda" es la ÚNICA pantalla funcional
- ❌ Tabs (Horario, Stats, etc.) no funcionan
- ❌ Sin jerarquía visual
- ❌ Botones minúsculos (28x28px)
- ❌ Colores caóticos
- ❌ Sin Home clara
- ❌ Pantallas faltantes (Perfil, Reseñas, Clientes, etc.)

## ✅ Estado Deseado (Profesional)
- ✅ Home inteligente (Dashboard con dinero + citas)
- ✅ Agenda (citas del día, confirmar/rechazar)
- ✅ Horario (definir horas, descansos, días libres)
- ✅ Reseñas (ver valoraciones de clientes)
- ✅ Clientes Frecuentes (recurrentes + historial)
- ✅ Perfil/Configuración (datos personales, métodos de pago)
- ✅ Disponibilidad On/Off (para activar/desactivar)
- ✅ Estadísticas (ingresos, comisiones, gráficos)
- ✅ Navegación clara (tabs funcionales)
- ✅ UI profesional (botones grandes, colores coherentes, spacing adecuado)

---

## 🎯 CAMBIOS POR COMPONENTE

### 1. THEME CENTRALIZADO (CRÍTICO)
**Archivo nuevo:** `mobile/src/theme/barberTheme.ts`

```typescript
export const BARBER_COLORS = {
  // Brand
  primary: '#C9A84C',      // Dorado
  dark: '#0A0A0A',         // Negro
  surface: '#1A1A1A',      // Gris oscuro
  
  // Semantic
  success: '#00DD00',      // Verde
  pending: '#FFD700',      // Amarillo
  warning: '#FF6600',      // Naranja
  error: '#FF4444',        // Rojo
  
  // Text
  text: '#FFFFFF',         // Blanco
  textSecondary: '#AAAAAA',// Gris claro
  textTertiary: '#888888', // Gris oscuro
  
  // Background
  bgPrimary: '#0A0A0A',
  bgSecondary: '#141414',
};

export const BARBER_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BARBER_TYPOGRAPHY = {
  h1: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  h3: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};
```

### 2. HOME/DASHBOARD (Nueva)
**Archivo:** `mobile/src/screens/barber/BarberHomeScreen.tsx`

Mostrar:
- 💰 Dinero ganado HOY (grande, destacado)
- 📊 Comisión % y ganancia
- 📅 Citas HOY (próxima cita)
- 🔔 Notificaciones nuevas
- ⏰ Horario de hoy (entrada/salida)
- 🎯 Botón "Disponible/No disponible" grande

### 3. AGENDA MEJORADA
**Archivo:** `mobile/src/screens/barber/AgendaScreen.tsx`

Cambios:
- Cards de cita rediseñadas (borde dorado izquierdo)
- Hora GRANDE (20px, bold)
- Nombre cliente destacado
- Botones GRANDES (48x48px mínimo, full-width)
- "Confirmar" / "Rechazar" en texto, no emojis
- Swipe actions (deslizar para confirmar/rechazar)
- Real-time updates (gracias a onSnapshot)

### 4. HORARIO MEJORADO
**Archivo:** `mobile/src/screens/barber/BarberScheduleScreen.tsx`

Cambios:
- Vista semanal más clara
- Días como cards (Lunes, Martes, etc.)
- Entrada/Salida/Descanso con timepickers
- Días libres con date picker
- Botón "Guardar" destacado
- Preview de horario actual

### 5. RESEÑAS (Nueva)
**Archivo:** `mobile/src/screens/barber/ReviewsScreen.tsx`

Mostrar:
- Rating general (⭐ 4.5/5)
- Reseñas recientes (últimas 20)
- Card por reseña:
  - Cliente
  - Rating (estrellas)
  - Texto
  - Fecha
  - Servicio

### 6. CLIENTES FRECUENTES (Nueva)
**Archivo:** `mobile/src/screens/barber/FrequentClientsScreen.tsx`

Mostrar:
- Lista de clientes recurrentes
- Foto de cliente
- Nombre
- Última cita (fecha)
- Servicios preferidos
- Veces que visitó
- Tap para ver historial

### 7. PERFIL/CONFIGURACIÓN (Mejorada)
**Archivo:** `mobile/src/screens/barber/BarberProfileScreen.tsx`

Agregar:
- Foto de perfil (editable)
- Nombre completo
- Email
- Teléfono
- Métodos de pago (bizum, paypal, efectivo)
- Rating visible
- Especialidades
- Botón "Editar perfil"

### 8. DISPONIBILIDAD ON/OFF (Nueva)
**Archivo:** `mobile/src/screens/barber/AvailabilityToggleScreen.tsx` (o widget en Home)

- Toggle grande (ON/OFF)
- Estado actual
- "Disponible hasta..." (picker de hora)
- Last updated timestamp

### 9. NAVEGACIÓN ARREGLADA
**Archivo:** `mobile/src/navigation/BarberNavigator.tsx`

Cambios:
- Bottom tab navigator funcional (no header dinámico)
- 5 tabs principales:
  1. 🏠 Home
  2. 📅 Agenda
  3. 📊 Stats
  4. 👤 Perfil
  5. ⚙️ Más (Horario, Reseñas, Clientes, Disponibilidad)
- Cada tab tiene su stack navigator

---

## 🔧 TAREAS ESPECÍFICAS

### Task 1: Theme Centralizado
- Crear `mobile/src/theme/barberTheme.ts`
- Crear hook `useBarberTheme()`
- Importar en todos los componentes
- Remover colores hardcodeados

### Task 2: Home/Dashboard Barbero
- Crear `BarberHomeScreen.tsx`
- Agregar a tab navigator
- Mostrar: dinero hoy, comisión, citas, notificaciones
- Botón "Disponible/No disponible"

### Task 3: Agenda Rediseñada
- Mejorar cards (borde dorado, spacing)
- Botones GRANDES (48x48px)
- Real-time con onSnapshot (ya implementado)
- Swipe actions para confirmar/rechazar

### Task 4: Horario Mejorado
- UI más clara (días como cards)
- Timepickers funcionales
- Guardar horario
- Preview semanal

### Task 5: Reseñas Screen (Nueva)
- Crear `ReviewsScreen.tsx`
- Query reseñas de Firestore
- Mostrar rating + comentarios
- Listener en tiempo real

### Task 6: Clientes Frecuentes (Nueva)
- Crear `FrequentClientsScreen.tsx`
- Calcular clientes recurrentes (múltiples citas)
- Mostrar historial por cliente
- Servicios preferidos

### Task 7: Perfil/Config Mejorada
- Agregar foto de perfil
- Métodos de pago
- Especialidades
- Botón "Editar"

### Task 8: Disponibilidad On/Off (Nueva)
- Toggle visible en Home o tab
- Guardar estado en Firestore
- Sincronizar en tiempo real
- Cliente lo ve en disponibilidad

### Task 9: Bottom Tab Navigator
- 5 tabs principales funcionales
- Tab "Más" con opciones secundarias
- Iconos + labels
- Active state con color dorado

---

## 📱 MOCKUP VISUAL (Resumido)

### Home/Dashboard
```
┌─────────────────────────────┐
│ BarberFlow      Notificaciones│
├─────────────────────────────┤
│ 💰 Ganancias HOY           │
│    €145.00                   │
│    Comisión: 20% = €29      │
├─────────────────────────────┤
│ 📅 Próxima cita: 10:00      │
│    ClienteQA - Corte        │
├─────────────────────────────┤
│    [Disponible] [No Disp.]  │
├─────────────────────────────┤
│ ⏰ Hoy: 09:00 - 20:00       │
│ ☀️  Descanso: 14:00 - 15:00 │
└─────────────────────────────┘
```

### Agenda (Card mejorada)
```
┌──────────────────────────────┐
│ 10:00           ✓ Confirmada │
│ ClienteQA                    │
│ cliente@barberflow.dev       │
│ Corte + Barba • 45 min • €22 │
│                              │
│ [  Confirmar  ] [ Rechazar ] │
└──────────────────────────────┘
```

---

## ⏱️ Estimación

- Theme: 1 hora
- Home: 2 horas
- Agenda: 2 horas
- Horario: 1.5 horas
- Reseñas: 1.5 horas
- Clientes Frecuentes: 1.5 horas
- Perfil: 1 hora
- Disponibilidad: 1 hora
- Navigator: 1 hora

**Total: ~12 horas de trabajo concentrado**

---

## 🎯 Prioridad

1. **P0 (CRÍTICO):** Theme + Home + Agenda + Navigator
2. **P1 (IMPORTANTE):** Horario + Perfil + Disponibilidad
3. **P2 (BUENO TENER):** Reseñas + Clientes Frecuentes

---

## ✅ Definition of Done

- ✅ UI profesional (sin colores hardcodeados)
- ✅ Botones grandes y accesibles (48x48px mínimo)
- ✅ Navegación funcional (tabs que funcionan)
- ✅ Todas las pantallas accesibles
- ✅ Real-time sync funcionando (onSnapshot)
- ✅ Sin memory leaks (cleanup functions)
- ✅ Screenshots en M9 se ven bien
- ✅ Flujos de usuario completos

