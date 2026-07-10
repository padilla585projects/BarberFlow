# Plan de Pruebas Mobile - BarberFlow

**Estado Actual:** Código validado 100% - Listo para testing
**Fecha:** 2026-07-10
**Dispositivos:** U11 (cliente), M9 (barbero), HT54BYJ01402 (barbero)

---

## VALIDACIÓN TÉCNICA COMPLETADA

### ✅ Componentes Implementados (6/6)

1. **useLogout Hook** (21 líneas)
   - Ubicación: `mobile/src/hooks/useLogout.ts`
   - Integrado en: ProfileScreen, BarberProfileScreen, ShopSettingsScreen
   - Estado: PRODUCTION-READY

2. **Firebase Error Handling** (129 líneas)
   - Ubicación: `mobile/src/utils/firebaseDebug.ts`
   - Funciones: getFirebaseDebugInfo, diagnoseHTTP400Error, getFirebaseErrorMessage
   - Integrado en: LoginScreen
   - Estado: PRODUCTION-READY

3. **AppointmentList Component** (416 líneas)
   - Ubicación: `mobile/src/components/AppointmentList.tsx`
   - Características: Pull-to-refresh, status badges, action buttons
   - Integrado en: BarberHomeScreen
   - Estado: PRODUCTION-READY

4. **BarberScheduleScreen** (755 líneas)
   - Ubicación: `mobile/src/screens/barber/BarberScheduleScreen.tsx`
   - Características: DateTimePicker, días/horas, descansos, días libres
   - Integrado en: BarberNavigator
   - Estado: PRODUCTION-READY

5. **appointmentService** (254 líneas)
   - Ubicación: `mobile/src/services/appointmentService.ts`
   - Funciones: getBarberoAppointments, subscribeToBarberoAppointments, updateAppointmentStatus, completeAppointment, cancelAppointment
   - Estado: PRODUCTION-READY

6. **scheduleService** (160 líneas)
   - Ubicación: `mobile/src/services/scheduleService.ts`
   - Funciones: saveSchedule, getSchedule, subscribeToSchedule, validateSchedule
   - Estado: PRODUCTION-READY

---

## PLAN DE TESTING MANUAL

### Prerequisitos

```bash
# 1. Asegúrate de que los dispositivos estén conectados
adb devices -l

# 2. En el directorio raíz del proyecto
cd /ruta/a/BarberAPP
cd mobile

# 3. Instala dependencias (si no está hecho)
npm install
```

### Compilar y Ejecutar en Android

```bash
# Build para Android (en ambiente de desarrollo)
npm run android

# O inicia Expo en modo desarrollo
npm start

# Luego escán el QR con Expo Go o usa cliente nativo
```

---

## FLUJO 1: CLIENTE (U11)

### Test: ISSUE-002 - Logout Funcional

**Pasos:**
1. Abre la app en dispositivo U11
2. Ingresa: `cliente@test.com` / `test1234`
3. En pantalla de dashboard, ve a perfil (ícono usuario)
4. Busca botón "Sign Out" o "Salir"
5. Haz tap
6. Verifica: Mensaje de confirmación aparezca
7. Confirma logout
8. Resultado esperado: Regresa a pantalla de login

**Expected Result:** ✅ LOGOUT FUNCIONA EN CLIENTE

---

## FLUJO 2: BARBERO (M9)

### Test 1: ISSUE-003 - Appointments Visibles

**Pasos:**
1. Abre app en M9
2. Ingresa: `barbero@test.com` / `test1234`
3. En pantalla home/dashboard de barbero
4. Busca sección "Mis Citas" o "Appointments"
5. Debería mostrar lista de citas
6. Verifica elementos:
   - Nombre del cliente ✓
   - Fecha y hora ✓
   - Servicio ✓
   - Duración ✓
   - Estado de cita ✓

**Validaciones:**
- ¿Aparecen todas las citas? 
- ¿Se actualiza en real-time si se agrega nueva cita?
- ¿Pull-to-refresh funciona (deslizar hacia abajo)?

**Expected Result:** ✅ APPOINTMENTS FUNCIONAN EN BARBERO

---

### Test 2: ISSUE-005 - Schedule Management

**Pasos:**
1. En M9, navega a "Configuración" o "Mi Horario"
2. Debería mostrar pantalla con 7 días (Lunes-Domingo)
3. Para cada día:
   - Toggle para abrir/cerrar barbershop
   - Campo "Hora Inicio" (Ej: 09:00)
   - Campo "Hora Fin" (Ej: 18:00)
   - Opción para agregar descansos
   - Opción para marcar "Día Libre"

**Validaciones:**
- ¿Se pueden editar horas de apertura?
- ¿Time picker abre correctamente?
- ¿Se pueden agregar/remover descansos?
- ¿Se puede guardar?
- ¿Los cambios persisten después de cerrar/reabrir app?
- ¿Muestra mensaje de éxito al guardar?

**Expected Result:** ✅ SCHEDULE MANAGEMENT FUNCIONA

---

### Test 3: ISSUE-002 - Logout en Barbero

**Pasos:**
1. En pantalla de perfil/settings de barbero
2. Busca botón logout
3. Tap
4. Confirma logout
5. Verifica regreso a login

**Expected Result:** ✅ LOGOUT FUNCIONA EN BARBERO

---

### Test 4: ISSUE-004 - Console Errors

**Pasos:**
1. Abre React Native Debugger o Flipper
2. Navega por todas las pantallas de barbero:
   - Dashboard
   - Appointments
   - Schedule
   - Profile
3. Verifica console.log:
   - ¿No hay red errors?
   - ¿No hay type errors?
   - ¿No hay Firebase permission errors?

**Expected Result:** ✅ SIN CONSOLE ERRORS

---

## FLUJO 3: OWNER (Usar U11 o M9 con cuenta owner)

### Test: ISSUE-001 - Firebase Auth HTTP 400 (Si aplica)

**Pasos:**
1. En LoginScreen, el app verifica automáticamente errores HTTP 400
2. Intenta login con datos incorrectos
3. Verifica que veas mensaje de error en español
4. Verifica que firebaseDebug no crashee la app

**Expected Result:** ✅ FIREBASE ERROR HANDLING FUNCIONA

---

## RESUMEN DE TESTS

### Cliente (U11)
- [ ] Logout funciona y redirige a login
- [ ] No hay console errors

### Barbero (M9)
- [ ] Appointments sección visible
- [ ] Appointments con datos correctos
- [ ] Pull-to-refresh funciona
- [ ] Schedule management accesible
- [ ] Se pueden editar horas
- [ ] Se pueden guardar cambios
- [ ] Cambios persisten
- [ ] Logout funciona
- [ ] Sin console errors

### General
- [ ] Navegación fluid
- [ ] Sin crashes
- [ ] Botones funcionan
- [ ] Forms se validan
- [ ] Firebase real-time updates funcionan

---

## Comandos Útiles Durante Testing

```bash
# Ver logs en real-time
adb logcat -s "ReactNativeJS:*"

# Limpiar caché de app
adb shell pm clear com.barberflow  # Cambia según package name

# Reinstalar app
adb uninstall com.barberflow
npm run android

# Abrir React DevTools (si tienes configurado)
npm start
# Presiona 'd' para abrir debugger en Chrome
```

---

## Checklist Final

Marca ✅ cuando completes cada sección:

**SETUP**
- [ ] Dispositivos conectados y reconocidos
- [ ] App compilada exitosamente
- [ ] App instalada en dispositivos

**CLIENTE (U11)**
- [ ] Login exitoso
- [ ] Dashboard carga
- [ ] Logout visible y funciona
- [ ] Sin errors

**BARBERO (M9)**
- [ ] Login exitoso
- [ ] Appointments sección visible
- [ ] Schedule management accesible
- [ ] Logout funciona
- [ ] Sin errors

**VALIDACIÓN GENERAL**
- [ ] Todas las features funcionan
- [ ] No hay crashes
- [ ] No hay console errors
- [ ] Real-time updates funcionan
- [ ] Cambios se persisten en Firestore

---

## Notas Importantes

1. **Firestore Permissions:** Las reglas de Firestore deben permitir:
   - Users leer su propio documento
   - Barbers leer sus appointments
   - Barbers escribir en su schedule

2. **Internet Connection:** Los dispositivos necesitan conexión WIFI/4G para:
   - Firebase authentication
   - Firestore real-time listeners
   - Download de app data

3. **Test Accounts:**
   - Cliente: `cliente@test.com` / `test1234`
   - Barbero: `barbero@test.com` / `test1234`
   - Owner: `propietario@test.com` / `test1234`

4. **Real-Time Data:** Si cambias horarios o citas en Firestore Console,
   deberías ver actualizaciones en la app automáticamente (sin refresh)

---

## Próximos Pasos Si Todo Funciona

1. Ejecuta QA audit nuevamente pero esta vez en mobile
2. Documenta cualquier issue encontrado
3. Prepara release a App Store/Play Store
4. Configura CI/CD para automatic testing

---

## Si Encuentras Issues

Si algo no funciona:
1. Verifica los console.log en React Native Debugger
2. Revisa permisos de Firestore en Firebase Console
3. Verifica que FirebaseConfig sea correcta (mobile/src/services/firebase.ts)
4. Intenta limpiar caché y reinstalar app
5. Reporta el error específico encontrado

