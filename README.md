# ✂️ BarberFlow

> Plataforma completa de gestión de barberías — reservas online, gestión de barberos, inventario y reportes.

---

## ¿Qué es BarberFlow?

BarberFlow es una aplicación móvil y panel web diseñada para modernizar la gestión de barberías. Los clientes pueden reservar citas fácilmente desde su móvil, mientras que los barberos y dueños tienen todo el control de su negocio en un solo lugar.

---

## Características principales

### Para clientes
- Registro e inicio de sesión con Google
- Explorar barberías disponibles
- Seleccionar servicios (corte, barba, etc.) con precios
- Reservar cita en calendario con horario disponible
- Historial de visitas y compras
- Reprogramar una cita ya reservada

### Para barberos
- Ver agenda del día en tiempo real
- Registrar una **cita sin reserva** para quien entra sin cita previa, que ocupa
  el hueco al instante y entra en caja y en los informes
- Registrar venta de servicios y productos al terminar con el cliente
- Consultar sus propios stats (clientes, ingresos)

### Para dueños
- Gestión de barberos del local
- Gestión de servicios y precios
- Control de inventario (productos a la venta)
- Reportes semanales/mensuales exportables en Excel

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| App móvil | Expo (React Native) — iOS & Android |
| Panel web | React + Vite + TypeScript |
| Base de datos | Firebase Firestore |
| Autenticación | Firebase Auth (Google Sign-In) |
| Almacenamiento | Firebase Storage |
| Backend / Reportes | Firebase Cloud Functions + ExcelJS |
| Pagos | Stripe Connect, Bizum, transferencia, PayPal y efectivo |

Las citas se crean, mueven y validan en la Cloud Function `bookAppointment`, que
es el único escritor de `appointments`: decide el precio leyendo el catálogo de
la barbería y comprueba el solapamiento dentro de la misma transacción que
escribe, de modo que dos personas no pueden reservar el mismo hueco.

El historial de cambios está en [CHANGELOG.md](CHANGELOG.md).

---

## Estructura del proyecto

```
BarberFlow/
├── mobile/          # App móvil (Expo / React Native)
│   └── src/
│       ├── screens/       # Pantallas por rol (auth, client, barber, owner)
│       ├── components/    # Componentes reutilizables
│       ├── navigation/    # Navegación por roles
│       ├── services/      # Firebase, API calls
│       ├── hooks/         # Custom hooks
│       └── types/         # Tipos TypeScript
│
├── web-admin/       # Panel web de administración (React + Vite)
│   └── src/
│       ├── pages/         # Páginas por rol (owner, barber, developer)
│       ├── components/    # Componentes UI
│       ├── services/      # Firebase
│       ├── hooks/         # Custom hooks
│       └── types/         # Tipos TypeScript
│
└── backend/         # Firebase Cloud Functions
    └── src/
        ├── functions/     # Funciones (reportes Excel, notificaciones)
        └── models/        # Modelos de datos
```

---

## Roles y permisos

| Rol | App móvil | Panel web |
|-----|-----------|-----------|
| **Cliente** | Reservas e historial | — |
| **Barbero** | Agenda y cobro | Sus estadísticas |
| **Dueño** | Gestión completa de su barbería | Gestión completa |
| **Developer** | Acceso total | Superadmin |

---

## Configuración del entorno

Copia el archivo `.env.example` y rellena las credenciales de Firebase:

```bash
# En mobile/
cp .env.example .env

# En web-admin/
cp .env.example .env
```

---

## Licencia

Copyright (c) 2026 padilla585projects — All Rights Reserved.  
Uso, copia o distribución no autorizados están estrictamente prohibidos.
