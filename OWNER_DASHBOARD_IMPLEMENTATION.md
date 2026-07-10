# Owner Admin Dashboard - Documentación Completa

## Resumen de Implementación

Se ha implementado un dashboard de administración completo para propietarios de barberías, reemplazando la falta de gestión empresarial. El dashboard es accesible en `/owner-dashboard` y permite a los propietarios gestionar completamente su negocio desde una interfaz profesional.

## Ruta de Acceso

```
https://barberflow-2026.web.app/owner-dashboard
```

Requiere autenticación con rol `owner` o `developer`.

## Estructura General

### Componentes Principales

```
web-admin/src/
├── pages/owner/
│   ├── OwnerDashboard.tsx              # Page principal con tabs
│   └── OwnerDashboard.module.css       # Estilos centralizados
├── components/owner/
│   ├── Overview.tsx                    # Pestaña 1: Resumen KPIs
│   ├── BarbershopSettings.tsx          # Pestaña 2: Configuración
│   ├── EmployeeManagement.tsx          # Pestaña 3: Gestión de barberos
│   ├── ServiceManagement.tsx           # Pestaña 4: Gestión de servicios
│   └── AnalyticsPage.tsx               # Pestaña 5: Análisis y reportes
└── services/
    └── analytics.ts                    # Funciones de cálculo estadístico
```

## Funcionalidades por Pestaña

### 1. Resumen (Overview)

**Archivo**: `Overview.tsx`

Muestra métricas clave en tiempo real:

- **Ingresos Hoy**: Total de dinero ingresado en el día
- **Ingresos Este Mes**: Total acumulado del mes actual
- **Citas Hoy**: Número de citas con desglose (completadas/pendientes)
- **Propinas Hoy**: Total de propinas recibidas
- **Total Clientes**: Cantidad de clientes únicos
- **Barberos Activos**: Número de barberos en la barbería
- **Servicios**: Cantidad de servicios ofrecidos
- **Citas Pendientes**: Citas que requieren atención

Además incluye:
- Actividad reciente (últimas 10 transacciones)
- Feed actualizado en tiempo real

### 2. Configuración (Settings)

**Archivo**: `BarbershopSettings.tsx`

Permite editar información de la barbería:

**Información Básica**:
- Nombre de la barbería
- Dirección completa
- Teléfono de contacto

**Horario de Apertura**:
- 7 días de la semana (Lunes a Domingo)
- Checkbox para habilitar/deshabilitar día
- Hora de apertura y cierre (formato 24h)
- Almacenamiento automático en Firebase

### 3. Barberos (Employees)

**Archivo**: `EmployeeManagement.tsx`

Gestión completa del equipo:

**Funcionalidades**:
- Listar barberos activos con foto, email, teléfono y rol
- Agregar nuevos barberos mediante modal
- Editar información de barberos
- Eliminar barberos (requiere confirmación)
- Actualizar lista en tiempo real

**Modal de Agregar**:
- Nombre completo
- Email
- Teléfono (opcional)

### 4. Servicios (Services)

**Archivo**: `ServiceManagement.tsx`

Gestión de servicios ofrecidos:

**CRUD Completo**:
- **Crear**: Nuevo servicio con nombre, precio, duración y descripción
- **Leer**: Tabla de servicios con toda la información
- **Actualizar**: Editar servicio existente
- **Eliminar**: Borrar servicio con confirmación

**Campos por Servicio**:
- Nombre (ej: "Corte Clásico")
- Precio en euros (con 2 decimales)
- Duración en minutos (múltiplos de 15)
- Descripción (opcional)

### 5. Análisis (Analytics)

**Archivo**: `AnalyticsPage.tsx`

Reportes y estadísticas detalladas:

**KPIs Generales**:
- Ingresos totales acumulados
- Citas completadas
- Tasa de conversión (%)
- Valor promedio de venta

**Gráficas (Últimos 30 días)**:
- **Gráfica de Líneas**: Tendencia de ingresos diarios
- **Gráfica de Barras**: Citas por estado (completadas/pendientes/canceladas)

**Ranking de Barberos**:
- Posición con medallas (1°, 2°, 3°)
- Nombre del barbero
- Cantidad de citas completadas
- Total de ingresos generados

## Interfaz y UX

### Tema de Colores

```css
Colores principales:
- Fondo oscuro: #0a0a0a
- Cards: #1a1a1a
- Bordes: #222
- Texto primario: #fff
- Texto secundario: #999 / #666
- Acento principal: #c9a84c (dorado)
- Éxito: #4ade80 (verde)
- Error: #f87171 (rojo)
- Advertencia: #fbbf24 (amarillo)
```

### Componentes Reutilizables

1. **Tabs Navigation**: Cambio fluido entre secciones
2. **Cards**: Contenedores para información
3. **Tablas**: Listado de datos con acciones
4. **Modales**: Formas de agregar/editar
5. **Mensajes**: Feedback de éxito/error

### Responsive Design

- Grid layout que se adapta a diferentes tamaños
- Tables con scroll horizontal en mobile
- Componentes empilados en pantallas pequeñas
- Optimizado para desktop, tablet y móvil

## Servicios Auxiliares

### `analytics.ts`

Funciones de cálculo estadístico:

```typescript
// Calcular estadísticas de un barbero
calculateBarberStats(barberId, appointments, sales, barbers)

// Calcular estadísticas de la tienda
calculateShopStats(appointments, sales)

// Obtener ingresos por día
getRevenueByDay(appointments, sales, days)

// Obtener citas por día
getAppointmentsByDay(appointments, days)
```

## Integración con Firebase

Todos los datos se cargan desde Firestore:

```
Colecciones utilizadas:
- barbershops (lectura/escritura)
- users (lectura)
- appointments (lectura)
- sales (lectura)
```

Permisos requeridos:
- Owner: Puede editar su propia barbería
- Developer: Acceso completo

## Flujos de Datos

### Al abrir el dashboard:

1. Se obtiene el ID de la barbería del usuario autenticado
2. Se cargan en paralelo:
   - Datos de la barbería (settings)
   - Lista de barberos (employees)
   - Todas las citas (appointments)
   - Todas las ventas (sales)
3. Se procesan y se muestran los datos en cada tab

### Al guardar cambios:

1. Se validan los datos en el formulario
2. Se envían a Firebase mediante `updateBarbershop()`
3. Se actualiza el estado local (UI se refleja inmediatamente)
4. Se muestra mensaje de confirmación

## Seguridad y Permisos

- Las rutas están protegidas con `ProtectedRoute`
- Solo usuarios con rol `owner` o `developer` pueden acceder
- Cada propietario solo ve su propia barbería
- Los cambios se guardan en Firebase con validación

## Funcionalidades Futuras

Mejoras que pueden agregarse posteriormente:

1. **Calendario interactivo** para citas
2. **Exportación de reportes** (PDF/CSV)
3. **Gestión de promociones** y códigos descuento
4. **Sistema de mensajería** con clientes
5. **Notificaciones en tiempo real**
6. **Integración con pagos** (Stripe/Bizum)
7. **Backup automático** de datos
8. **Control de acceso granular** (permisos por barbero)

## Ejemplo de Uso

### Para editar la barbería:

1. Ir a `/owner-dashboard`
2. Click en tab "Configuración"
3. Llenar formulario con datos
4. Click en "Guardar Cambios"
5. Confirmación visual de éxito

### Para agregar un servicio:

1. Ir a `/owner-dashboard`
2. Click en tab "Servicios"
3. Click en "+ Agregar Servicio"
4. Completar formulario:
   - Nombre: "Corte de Cabello"
   - Precio: "15.00"
   - Duración: "30"
5. Click en "Agregar"

### Para ver análisis:

1. Ir a `/owner-dashboard`
2. Click en tab "Análisis"
3. Ver gráficas de ingresos y citas
4. Desplazarse para ver ranking de barberos

## Archivos Modificados

- `web-admin/src/App.tsx`: Agregada ruta `/owner-dashboard`

## Archivos Creados

**Páginas**:
- `web-admin/src/pages/owner/OwnerDashboard.tsx` (160 líneas)
- `web-admin/src/pages/owner/OwnerDashboard.module.css` (460 líneas)

**Componentes**:
- `web-admin/src/components/owner/Overview.tsx` (143 líneas)
- `web-admin/src/components/owner/BarbershopSettings.tsx` (201 líneas)
- `web-admin/src/components/owner/EmployeeManagement.tsx` (244 líneas)
- `web-admin/src/components/owner/ServiceManagement.tsx` (275 líneas)
- `web-admin/src/components/owner/AnalyticsPage.tsx` (207 líneas)

**Servicios**:
- `web-admin/src/services/analytics.ts` (148 líneas)

**Total**: 1,840 líneas de código

## Testing

Para verificar que todo funciona:

```bash
# Compilar el proyecto
npm run build

# Ejecutar en desarrollo
npm run dev

# Navegar a
http://localhost:5173/owner-dashboard
```

Asegúrate de:
1. Estar autenticado como owner
2. Tener una barbería asociada
3. Ver las tabs cargadas correctamente
4. Poder guardar cambios sin errores

## Notas de Implementación

- Usa componentes funcionales con hooks
- Manejo de errores con try-catch y mensajes al usuario
- Estados de loading durante operaciones
- Validación básica en formularios
- Optimización de renderizado con useMemo
- Estilos CSS Modules para encapsulación
- Compatible con TypeScript

## Contacto y Soporte

Para reportar problemas o sugerencias sobre el dashboard, contacta al equipo de desarrollo.
