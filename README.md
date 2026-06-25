# BarberAPP

Plataforma completa de gestión de barberías: reservas online, gestión de barberos, inventario y reportes.

## Estructura

```
BarberAPP/
├── mobile/        # App móvil (Expo / React Native) — iOS & Android
├── web-admin/     # Panel web de administración (React + Vite)
└── backend/       # Firebase Cloud Functions + configuración
```

## Roles

| Rol | App móvil | Panel web |
|---|---|---|
| Cliente | Reservas, historial | — |
| Barbero | Agenda, cobro | Sus stats |
| Dueño | Gestión completa de su barbería | Gestión completa |
| Developer | Todo | Todo (superadmin) |

## Stack

- **Mobile**: Expo (React Native)
- **Web Admin**: React + Vite
- **Backend**: Firebase (Firestore, Auth, Cloud Functions, Storage)
- **Auth**: Google Sign-In (Firebase Auth)
- **Reportes**: Excel con exceljs (Cloud Function)
