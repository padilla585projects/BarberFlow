# E2E Testing Plan - BarberFlow Chrome Web-Admin

**Fecha:** 2026-07-10  
**URL:** https://barberflow-2026.web.app  
**Navegador:** Chrome  

---

## Usuarios de Prueba

| Email | Password | Rol | Acceso |
|-------|----------|-----|--------|
| cliente@test.com | test1234 | Cliente | Booking, Pagos |
| barbero@test.com | test1234 | Barbero | Citas, Horarios |
| propietario@test.com | test1234 | Propietario | Admin, Dashboard |

**Nota:** Si no funcionan, registrate en Chrome con credenciales nuevas

---

## Flujos a Probar

### 1. CLIENTE (cliente@test.com)
- [ ] Login en web
- [ ] Buscar barberia "Barber Norte"
- [ ] Ver horarios disponibles
- [ ] Reservar cita para manana
- [ ] Ver confirmacion
- [ ] Proceder a pago (checkout)
- [ ] Validar orden creada
- [ ] Ver en "Mis citas"

**Resultado esperado:** Flujo completo cliente -> barberia -> cita -> pago

---

### 2. BARBERO (barbero@test.com)
- [ ] Login en web
- [ ] Ver dashboard de barbero
- [ ] Listar citas asignadas
- [ ] Marcar cita como "En progreso"
- [ ] Completar cita
- [ ] Ver ganancias del dia
- [ ] Validar comision calculada

**Resultado esperado:** Barbero puede gestionar sus citas

---

### 3. PROPIETARIO (propietario@test.com)
- [ ] Login en web
- [ ] Acceder a Dashboard
- [ ] Ver ingresos totales
- [ ] Revisar "Citas" modulo
- [ ] Ver "Inventario" (si existe)
- [ ] Revisar "Finanzas"
- [ ] Gestionar "Barberos" (equipo)
- [ ] Ver "Pedidos Shop" (e-commerce)

**Resultado esperado:** Propietario tiene visibilidad completa

---

## Casos de Error a Validar

| Caso | Pasos | Resultado Esperado |
|------|-------|-------------------|
| Login invalido | Email incorrecto + password | Muestra error "Email o contrasena incorrectos" |
| Email no registrado | Intentar login con email nuevo | Muestra "Usuario no encontrado" |
| Booking sin sesion | Intentar reservar sin login | Redirige a login |
| Pago cancelado | Iniciar checkout y cerrar | Reserva se mantiene en estado "pendiente" |

---

## Checklist Final

- [ ] Todos los flujos principales funcionan
- [ ] No hay errores 404
- [ ] No hay mensajes de error no controlados
- [ ] UI es responsiva en Chrome
- [ ] Datos persisten en Firestore
- [ ] Transacciones se registran correctamente

---

## Notas

- Tomar screenshots de cada flujo completado
- Si algo falla, anotar: URL -> Error -> Mensaje exacto
- Validar en Firestore Console que los datos se guardaron
- Revisar Cloud Functions logs si hay errores backend
