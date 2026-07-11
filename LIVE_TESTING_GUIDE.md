# Live Testing Guide - HTC M9 + Chrome

**Objetivo:** Validar todas las features en tiempo real
**Dispositivos:** 
- HTC M9 (Barbero flow - MOBILE APP)
- Chrome (Owner dashboard - WEB-ADMIN)

---

## SETUP INICIAL

### Paso 1: Preparar Terminal para HTC (Logs en vivo)

Abre una terminal PowerShell o CMD y ejecuta:

```powershell
# Terminal 1: Ver logs en tiempo real del HTC
D:\Android\Sdk\platform-tools\adb.exe -s HT54BYJ01402 logcat -s "ReactNativeJS:*"
```

Verás logs como:
```
ReactNativeJS: [Appointment] Loaded 3 appointments
ReactNativeJS: [Schedule] Saved schedule successfully
```

### Paso 2: Abrir Chrome con Web-Admin

En otra ventana, abre Chrome:

```
https://barberflow-2026.web.app
```

Login como: `propietario@test.com` / `test1234`

### Paso 3: Abrir App en HTC

En el HTC, toca la app "BarberFlow" (si está instalada)

O desde terminal:
```powershell
D:\Android\Sdk\platform-tools\adb.exe -s HT54BYJ01402 shell am start -n com.barberflow/.MainActivity
```

---

## TEST PLAN - BARBERO FLOW (HTC M9)

### Test 1: LOGIN BARBERO

**Paso 1:** En HTC, login screen debería estar visible

**Paso 2:** Ingresa:
- Email: `barbero@test.com`
- Password: `test1234`

**Paso 3:** Tap "INICIAR SESIÓN"

**Validación esperada:**
- ✅ Dashboard carga sin errores
- ✅ Terminal muestra: "Login successful"
- ✅ Sin errores rojos en logcat

**Si falla:** Revisa logcat para mensajes de error

---

### Test 2: APPOINTMENTS (ISSUE-003)

**Paso 1:** En HTC dashboard, busca sección "Mis Citas"

**Paso 2:** Verifica que muestre:
- ✅ Nombre del cliente
- ✅ Fecha y hora
- ✅ Nombre del servicio
- ✅ Duración en minutos
- ✅ Estado de la cita

**Paso 3:** Test Pull-to-Refresh
- Desliza hacia arriba desde el tope
- Debería refrescar la lista
- Terminal mostrará: "Refreshing appointments"

**Paso 4:** Test completar cita
- Busca botón "Completado" o "Complete"
- Tap en la cita
- El estado debería cambiar a "completed"
- Terminal mostrará: "Appointment status updated"

**Validación final:**
- ✅ Mis Citas visible y con datos
- ✅ Pull-to-refresh funciona
- ✅ Puede cambiar estado
- ✅ Sin console errors

---

### Test 3: SCHEDULE MANAGEMENT (ISSUE-005)

**Paso 1:** En HTC, navega a "Mi Horario" (ícono de calendario o settings)

**Paso 2:** Verifica estructura
- ✅ Ve 7 días (Lunes a Domingo)
- ✅ Cada día tiene toggle (abierto/cerrado)
- ✅ Cada día tiene hora inicio/fin

**Paso 3:** Editar horario para Lunes
- Tap en "Hora Inicio" para Lunes
- Debería abrirse Time Picker
- Selecciona: 10:00
- Tap fuera para cerrar picker
- Verifica que el campo se actualice

**Paso 4:** Agregar descanso
- Busca opción "Agregar Descanso"
- Selecciona hora (ej: 12:00-13:00)
- Guarda descanso

**Paso 5:** Guardar cambios
- Scroll hasta abajo
- Tap "Guardar" o "Save"
- Terminal debería mostrar: "Schedule saved successfully"
- App debería mostrar toast de éxito

**Paso 6:** Validar persistencia
- Cierra completamente la app (swipe arriba)
- Reabre la app
- Login de nuevo
- Va a "Mi Horario"
- Verifica que los cambios estén ahí

**Validación final:**
- ✅ Mi Horario accessible
- ✅ Time picker funciona
- ✅ Puede guardar cambios
- ✅ Cambios persisten
- ✅ Sin console errors

---

### Test 4: LOGOUT (ISSUE-002)

**Paso 1:** En HTC, navega a Profile
- Tap ícono de usuario (abajo a la derecha)
- Debería mostrar perfil del barbero

**Paso 2:** Busca botón "Sign Out" o "Salir"
- ✅ Botón visible

**Paso 3:** Tap logout
- Alert/Dialog debería aparecer
- "¿Está seguro que desea cerrar sesión?"

**Paso 4:** Confirma logout
- Tap "Sí" o "Confirmar"
- Terminal mostrará: "User signed out"
- App debería redirigir a login screen

**Paso 5:** Verifica login screen
- ✅ Estás en login
- ✅ Campos email/password vacíos
- ✅ Puedes hacer login nuevamente

**Validación final:**
- ✅ Logout button visible
- ✅ Confirmation dialog aparece
- ✅ Se limpia sesión
- ✅ Redirige a login
- ✅ Sin console errors

---

### Test 5: CONSOLE ERRORS (ISSUE-004)

**Paso 1:** Mientras usas la app, revisa constantemente la terminal de logs

**Busca estos indicadores de ÉXITO:**
```
ReactNativeJS: [INFO] Operation successful
ReactNativeJS: [DEBUG] Network request completed
```

**Busca estos indicadores de ERROR:**
```
ReactNativeJS: ERROR
ReactNativeJS: FATAL
ReactNativeJS: Exception
ReactNativeJS: Cannot read
ReactNativeJS: undefined is not an object
```

**Paso 2:** Si ves errores:
- Nota el mensaje exacto
- Copia el stack trace
- Reporta el error

**Paso 3:** Navegación extensiva
- Login
- Ve a Mis Citas
- Ve a Mi Horario
- Edita horario
- Guarda
- Ve a Profile
- Logout
- Login de nuevo

**Durante toda la navegación:**
- ✅ Terminal debe estar relativamente limpia
- ✅ Máximo algunos WARNINGs
- ✅ Cero ERRORs o EXCEPTIONs

**Validación final:**
- ✅ Sin errores críticos
- ✅ App no crashea
- ✅ Navegación smooth

---

## TEST PLAN - OWNER DASHBOARD (CHROME)

### Test 6: OWNER LOGIN & DASHBOARD

**Paso 1:** En Chrome, abre:
```
https://barberflow-2026.web.app
```

**Paso 2:** Login
- Email: `propietario@test.com`
- Password: `test1234`
- Click "INICIAR SESIÓN"

**Validación esperada:**
- ✅ Dashboard carga
- ✅ Ver 5 tabs: Overview, Settings, Employees, Services, Analytics
- ✅ Sin errores en consola del navegador

**Paso 3:** Abre DevTools de Chrome
- Press F12
- Click "Console" tab
- Verifica: sin errores rojos

---

### Test 7: BUSINESS SETTINGS

**Paso 1:** Click tab "Settings" (Barbershop Settings)

**Paso 2:** Debería mostrar:
- ✅ Nombre de barbershop
- ✅ Dirección
- ✅ Teléfono
- ✅ Horario de apertura (7 días)

**Paso 3:** Edita un campo
- Cambiar nombre o dirección
- Click "Guardar"
- Debería ver mensaje de éxito

**Paso 4:** Actualiza página (F5)
- El cambio debería persistir

**Validación final:**
- ✅ Puede ver datos
- ✅ Puede editar
- ✅ Cambios se guardan
- ✅ Sin errors en consola

---

### Test 8: EMPLOYEE MANAGEMENT

**Paso 1:** Click tab "Employees"

**Paso 2:** Debería mostrar:
- ✅ Lista de barberos actuales
- ✅ Botón "Agregar Barbero"

**Paso 3:** Click "Agregar Barbero"
- Formulario debería abrirse
- Campos: Nombre, Email, Teléfono, etc.

**Paso 4:** Intenta agregar (puedes dejar en blanco por ahora)
- Click guardar
- Debería validar campos

**Validación final:**
- ✅ CRUD interface visible
- ✅ Formulario funciona
- ✅ Sin errors

---

### Test 9: SERVICE MANAGEMENT

**Paso 1:** Click tab "Services"

**Paso 2:** Debería mostrar:
- ✅ Lista de servicios (corte, afeitado, etc.)
- ✅ Botón "Agregar Servicio"

**Paso 3:** Click "Agregar Servicio"
- Campos: Nombre, Precio, Duración, Descripción

**Paso 4:** Editar un servicio
- Click en servicio existente
- Cambiar precio o duración
- Guardar

**Validación final:**
- ✅ Puede ver servicios
- ✅ Puede agregar/editar
- ✅ Cambios se guardan
- ✅ Sin errors

---

### Test 10: ANALYTICS

**Paso 1:** Click tab "Analytics"

**Paso 2:** Debería mostrar:
- ✅ Gráficos de ingresos
- ✅ Estadísticas de citas
- ✅ Datos de ventas

**Paso 3:** Navega la página
- Scroll para ver todo
- Los gráficos deberían cargar

**Validación final:**
- ✅ Analytics loads
- ✅ Gráficos visibles
- ✅ Sin errors

---

## VALIDACIÓN SIMULTANEA

Mientras pruebas en HTC, revisa Chrome periódicamente:

1. **En HTC:** Completa una cita
   - Terminal mostrará: "Appointment completed"
   - Ve a Chrome → Analytics
   - El conteo de citas completadas debería aumentar

2. **En HTC:** Edita schedule
   - Terminal mostrará: "Schedule updated"
   - Ve a Chrome → muestra horas disponibles
   - Debería reflejarse

3. **Real-time Sync:**
   - Cambios en HTC deberían verse en Chrome
   - O viceversa

---

## MATRIZ DE ISSUES

| Issue | Ubicación | Validación | Status |
|-------|-----------|-----------|--------|
| ISSUE-001 | HTC Login | Firebase error handling | ✅ |
| ISSUE-002 | HTC Profile | Logout funciona | ✅ |
| ISSUE-003 | HTC Mis Citas | Appointments visible | ✅ |
| ISSUE-004 | HTC Terminal | Sin console errors | ✅ |
| ISSUE-005 | HTC Mi Horario | Schedule management | ✅ |
| ISSUE-006 | Chrome Console | Owner dashboard errors | ✅ |
| ISSUE-007 | Chrome Tabs | Business management | ✅ |

---

## CHECKLIST FINAL

### HTC M9 (Mobile)
- [ ] Login exitoso
- [ ] Mis Citas visible y con datos
- [ ] Pull-to-refresh funciona
- [ ] Puede completar citas
- [ ] Mi Horario accesible
- [ ] Puede editar horas
- [ ] Puede guardar horario
- [ ] Cambios persisten
- [ ] Logout funciona
- [ ] Sin console errors

### Chrome (Web Admin)
- [ ] Login exitoso
- [ ] Dashboard con 5 tabs
- [ ] Settings accesible
- [ ] Employees CRUD funciona
- [ ] Services CRUD funciona
- [ ] Analytics carga
- [ ] Sin errors en consola
- [ ] Cambios se guardan
- [ ] Real-time sync funciona

### General
- [ ] App no crashea
- [ ] Navegación smooth
- [ ] Botones responden
- [ ] Mensajes de éxito/error aparecen
- [ ] Todo funciona bajo 3G/WiFi

---

## REPORTAR RESULTADOS

Cuando termines, copia este formato y llena con tus resultados:

```
TESTING REPORT - Live Session
Fecha: YYYY-MM-DD HH:MM

HTC M9 (Barbero):
  ISSUE-002 Logout: [PASS/FAIL] - Notas:
  ISSUE-003 Appointments: [PASS/FAIL] - Notas:
  ISSUE-004 Console Errors: [PASS/FAIL] - Notas:
  ISSUE-005 Schedule: [PASS/FAIL] - Notas:

Chrome (Owner):
  ISSUE-006 Dashboard: [PASS/FAIL] - Notas:
  ISSUE-007 Business Mgmt: [PASS/FAIL] - Notas:

Issues Encontrados:
  1. [Descripción del issue]
  2. [Stack trace si aplica]

Conclusión: [App ready for production / Needs fixes]
```

---

**¡Listo para comenzar!**

Abre las 3 ventanas:
1. Terminal con logs del HTC
2. HTC con la app
3. Chrome con web-admin

¿Comenzamos?
