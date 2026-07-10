# Instrucciones de Testing en Dispositivos Móviles

**Objetivo:** Validar que todas las 7 issues resueltas funcionan correctamente en ambiente real

**Tiempo estimado:** 1-2 horas

**Dispositivos necesarios:**
- U11 (Cliente flow)
- M9 (Barbero flow)
- HT54BYJ01402 (Barbero flow - opcional)

---

## Opción 1: Ejecución Automatizada (Recomendada)

### Windows (PowerShell)

```powershell
# 1. Abre PowerShell como Administrador
# 2. Navega al directorio del proyecto
cd D:\Descargas\Projects\BarberAPP

# 3. Ejecuta el script de testing
.\test-mobile.ps1

# Sigue las instrucciones en pantalla
```

### Linux/Mac (Bash)

```bash
# 1. Navega al directorio del proyecto
cd ~/Projects/BarberAPP

# 2. Ejecuta el script de testing
bash test-mobile.sh

# Sigue las instrucciones en pantalla
```

---

## Opción 2: Ejecución Manual Paso a Paso

### PREREQ: Verificar Conexión de Dispositivos

```bash
# Conecta los dispositivos vía USB
# Habilita USB Debugging en cada dispositivo

# Verifica que estén conectados
adb devices -l

# Deberías ver algo como:
# List of attached devices
# U11                    device
# M9                     device
# HT54BYJ01402          device
```

### PASO 1: Compilar Aplicación Móvil

```bash
cd D:\Descargas\Projects\BarberAPP\mobile

# Instala dependencias (si no está hecho)
npm install

# Build para Android
npm run android

# O usa Expo (alternative)
npm start
# Escanea QR code en dispositivos
```

### PASO 2: Testing CLIENTE (U11)

**Verificar:** ISSUE-002 (Logout)

1. Abre la app en U11
2. Ingresa email: `cliente@test.com`
3. Ingresa password: `test1234`
4. Espera a que dashboard cargue
5. Toca el ícono de perfil (usuario, abajo a la derecha)
6. Busca el botón "Sign Out" o "Salir"
7. **Verifica:** ✅ Botón logout visible
8. Toca el botón
9. **Verifica:** ✅ Aparece confirmación (Alert Dialog)
10. Toca "Confirmar" o "OK"
11. **Verifica:** ✅ Regresa a pantalla de login

**Resultado esperado:**
- ✅ ISSUE-002 - LOGOUT FUNCIONA EN CLIENTE

---

### PASO 3: Testing BARBERO (M9)

#### Test 3.1: Appointments (ISSUE-003)

1. Abre la app en M9
2. Ingresa email: `barbero@test.com`
3. Ingresa password: `test1234`
4. Espera a que dashboard de barbero cargue
5. Busca la sección "Mis Citas" o "Appointments"

**Verifica que muestre:**
- ✅ Nombre del cliente
- ✅ Fecha y hora de la cita
- ✅ Nombre del servicio
- ✅ Duración (minutos)
- ✅ Estado de la cita

**Test pull-to-refresh:**
6. Desliza la pantalla hacia abajo (pull-to-refresh)
7. **Verifica:** ✅ Se refresca la lista (si la app lo permite)

**Test acciones:**
8. Busca un botón "Completado" o "Completar"
9. Toca el botón
10. **Verifica:** ✅ El estado cambia a "completed"

**Resultado esperado:**
- ✅ ISSUE-003 - APPOINTMENTS FUNCIONAN EN BARBERO

---

#### Test 3.2: Schedule Management (ISSUE-005)

1. Desde dashboard de M9, navega a "Configuración" o "Mi Horario"
2. **Verifica que veas:** 7 días (Lunes, Martes, Miércoles, etc.)

**Para cada día, verifica:**
- ✅ Toggle/Switch para abrir/cerrar barbershop
- ✅ Campo "Hora Inicio" (ejemplo: 09:00)
- ✅ Campo "Hora Fin" (ejemplo: 18:00)
- ✅ Opción para agregar descansos
- ✅ Opción para marcar "Día Libre"

**Test editar horario:**
3. Toca el campo de "Hora Inicio" para Lunes
4. **Verifica:** ✅ Se abre Time Picker
5. Selecciona una hora (ejemplo: 10:00)
6. Cierra el time picker
7. **Verifica:** ✅ El campo se actualiza en la UI

**Test guardar:**
8. Busca botón "Guardar" o "Save"
9. Toca guardar
10. **Verifica:** ✅ Aparece mensaje de éxito
11. Cierra la app completamente
12. Reabre la app
13. Navega de nuevo a "Mi Horario"
14. **Verifica:** ✅ Los cambios persisten (se guardaron en Firestore)

**Resultado esperado:**
- ✅ ISSUE-005 - SCHEDULE MANAGEMENT FUNCIONA

---

#### Test 3.3: Logout en Barbero (ISSUE-002)

1. Desde cualquier pantalla de barbero, navega a Perfil/Settings
2. Busca botón "Sign Out" o "Salir"
3. **Verifica:** ✅ Botón visible
4. Toca el botón
5. **Verifica:** ✅ Aparece Alert de confirmación
6. Confirma logout
7. **Verifica:** ✅ Regresa a pantalla de login

**Resultado esperado:**
- ✅ ISSUE-002 - LOGOUT FUNCIONA EN BARBERO

---

#### Test 3.4: Console Errors (ISSUE-004)

1. Abre React Native Debugger o Flipper
   
   Opción A - React Native Debugger:
   ```bash
   # En terminal, mientras la app está corriendo
   npm start
   # Presiona 'd'
   ```
   
   Opción B - Expo DevTools:
   ```bash
   # En la misma terminal de npm start
   # Presiona 'Shift+d' (Mac) o 'w' (Windows)
   ```

2. Navega por todas las pantallas de barbero:
   - Dashboard
   - Mis Citas (Appointments)
   - Mi Horario (Schedule)
   - Perfil

3. Verifica console:
   - ✅ No hay errores rojos (Red X)
   - ✅ No hay Firebase permission errors
   - ✅ No hay network errors (4xx, 5xx)
   - ✅ No hay undefined errors
   - ✅ No hay type errors

**Resultado esperado:**
- ✅ ISSUE-004 - SIN CONSOLE ERRORS EN BARBERO

---

## Validación General

Marca cuando completes cada sección:

### Setup
- [ ] Dispositivos conectados
- [ ] App compilada sin errores
- [ ] App instalada en dispositivos

### Cliente (U11)
- [ ] Login exitoso
- [ ] Dashboard carga
- [ ] Logout visible
- [ ] Logout funciona
- [ ] Redirige a login
- [ ] Sin console errors

### Barbero (M9)
- [ ] Login exitoso
- [ ] Dashboard carga
- [ ] Appointments sección visible
- [ ] Appointments con datos correctos
- [ ] Pull-to-refresh funciona (si aplica)
- [ ] Schedule management accesible
- [ ] Se pueden editar horas
- [ ] Se pueden guardar cambios
- [ ] Cambios persisten después de cerrar app
- [ ] Logout visible
- [ ] Logout funciona
- [ ] Sin console errors

### General
- [ ] App no crashea
- [ ] Navegación es fluid
- [ ] Botones responden
- [ ] Forms se validan
- [ ] Real-time updates funcionan
- [ ] No hay comportamiento inesperado

---

## Comandos Útiles

### Ver logs en real-time
```bash
adb logcat -s "ReactNativeJS:*"
```

### Limpiar caché de la app
```bash
adb shell pm clear com.barberflow
# (Ajusta según el nombre del package)
```

### Reinstalar app completamente
```bash
adb uninstall com.barberflow
cd mobile
npm run android
```

### Abrir app específica
```bash
adb shell am start -n com.barberflow/.MainActivity
```

### Ver archivo de log
```bash
adb shell logcat > logcat.txt
```

---

## Reporte de Resultados

Después de completar los tests:

1. Abre archivo: `mobile-test-report.txt`
2. Llena los checkboxes (✅ o ❌)
3. Anota cualquier issue encontrado
4. Guarda el archivo
5. Comparte el resultado

---

## Si Encuentras Issues

Si algo no funciona:

1. **Verifica logs en console:**
   ```bash
   adb logcat | grep ReactNativeJS
   ```

2. **Revisa Firestore permissions:**
   - Ve a Firebase Console
   - Verifica que las reglas de Firestore permitan:
     - Users read their own document
     - Barbers read their appointments
     - Barbers write their schedule

3. **Verifica Firebase config:**
   - Abre `mobile/src/services/firebase.ts`
   - Verifica que la configuración coincida con tu Firebase project

4. **Limpia caché:**
   ```bash
   adb shell pm clear com.barberflow
   npm run android
   ```

5. **Restaura cambios en Firestore:**
   - Usa Firebase Admin SDK para resetear datos de test

---

## Comandos Rápidos para Copiar

```bash
# Setup inicial
cd D:\Descargas\Projects\BarberAPP\mobile
npm install
npm run android

# Ver logs
adb logcat -s "ReactNativeJS:*"

# Resetear app
adb uninstall com.barberflow
npm run android

# Abrir debugger
npm start
# Presiona 'd' (Windows) o 'Shift+d' (Mac)
```

---

## Notas Importantes

1. **Internet:** Los dispositivos necesitan WiFi/4G para Firebase
2. **Cuentas:** Usa las accounts de test, no crees nuevas
3. **Firestore:** Los cambios deberían sincronizar en real-time
4. **Logs:** Mantén adb logcat abierto en otra terminal
5. **Debugger:** Usa React Native Debugger para ver estado de app

---

## Próximos Pasos

Si todos los tests pasan:
1. Genera build final para Play Store
2. Configura CI/CD para testing automático
3. Prepara release notes
4. Planifica fecha de launch

Si hay issues:
1. Reporta errores específicos
2. Incluye screenshots
3. Incluye console logs
4. Revisa si es issue de código o Firebase config

---

**Tiempo total esperado:** 1-2 horas
**Resultado esperado:** ✅ Todos los 7 issues validados en dispositivos reales

¡Éxito con el testing! 🚀
