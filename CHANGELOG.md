# Changelog

## 1.5.1 — 27 de agosto de 2026

Build: APK `preview` (versionCode 17, runtime 1.5.1). Backend, reglas de
Firestore y hosting ya desplegados. **Play Store sigue en 1.5.0**, así que los
usuarios finales todavía no tienen nada de esto.

### Nuevo

**Cita sin reserva (walk-in).** El barbero puede registrar desde su agenda a
alguien que entra sin cita. Antes `addDoc` sobre `appointments` existía en un
único sitio —el flujo del cliente— así que ese rato seguía apareciendo libre
para reservar mientras el barbero estaba ocupado. Se guarda como cita real, con
servicios y precio, para que entre en caja y en los informes.

### Reserva de citas movida al servidor

Nueva Cloud Function `bookAppointment` (europe-west1), único escritor de
`appointments`. Cubre crear, walk-in y reprogramar.

- **Fin de la doble reserva.** No había transacción entre leer los huecos libres
  y crear la cita. El SDK Admin puede ejecutar una query dentro de una
  transacción, así que la comprobación de solapamiento y la escritura comparten
  transacción y Firestore mantiene bloqueado el conjunto leído hasta el commit.
  Cubre también solapamientos parciales entre horas de inicio distintas.
- **El precio ya no lo fija el cliente.** La función resuelve los `serviceIds`
  contra el catálogo de la propia barbería y recalcula el descuento leyendo el
  documento del promo (caducidad, `singleUse`, `maxUses`).
- Valida además que el barbero trabaje ese día según su horario personal
  (`daysOff` y descanso incluidos), que la cita quepa antes del cierre y que la
  hora caiga en la rejilla de 30 minutos.

### Seguridad

- **Retiradas tres funciones HTTP públicas sin autenticación.**
  `updateUserRole` era escalada de privilegios directa: aceptaba `{uid, role}` y
  escribía con el Admin SDK, saltándose las reglas, así que un POST bastaba para
  autoasignarse el rol `developer` — bypass en prácticamente todas las reglas.
  `addBarberToShop` y `fixProductImages` eran del mismo tipo. Ninguna tenía un
  solo llamante: eran restos de scripts de migración.
- Ampliada la regla de `users` para que "Añadir barbero" del panel funcione: la
  regla permitía solo `['role','barbershopId']` mientras el servicio escribe
  cuatro campos, así que el `hasOnly()` denegaba en silencio.

### Correcciones

- **Guardar Ajustes destruía la configuración de cobro.** `ShopSettingsScreen`
  reemplazaba el mapa entero de `paymentMethods` con booleanos planos, borrando
  el `connectAccountId` de Stripe Connect, el IBAN y el email de PayPal. Y no
  fallaba de forma visible: los métodos simplemente desaparecían del checkout.
- **`validatePayPalEmail` nunca guardó nada.** Estaba declarada `onRequest`
  mientras la app la llama con `httpsCallable`; leía `req.body` directamente y
  siempre salía por el 400. Reescrita como `onCall`.
- **Ocho botones del barbero no navegaban.** `BarberNavigator` es el
  Tab.Navigator y `navigate()` no busca en el stack de una pestaña hermana. Las
  rutas pasan a `barberRoutes.ts` con un mapa pantalla → pestaña tipado como
  Record total, así que añadir una pantalla sin asignarle pestaña no compila.
- **Tarjetas de agenda deformadas.** La tarjeta era `flexDirection: 'row'`, así
  que el bloque de acciones caía como columna lateral recortada: las tarjetas se
  veían enormes y vacías y los botones Confirmar / Rechazar / Completada eran
  invisibles.
- **Splash.** El fondo no cubría la pantalla porque `expo.backgroundColor` no
  estaba definido y `windowBackground` se generaba blanco. Y Android 12+
  enmascara el icono a un círculo descartando lo que sobresale del ~66% central,
  lo que recortaba el logo. Ajustados asset y configuración.
- **Dos páginas del panel se caían enteras** por citas antiguas sin `services` ni
  `totalPrice`: Citas y Cobros de clientes.

### Notas para quien despliegue

- `mobile/scripts/bump-version.js` **no incrementa `android.versionCode`**. Hay
  que subirlo a mano o Play rechaza la subida.
- El splash, los iconos y cualquier módulo nativo **no viajan por OTA**: exigen
  build nuevo. Los OTA solo llegan si coincide el runtime, que por política
  `appVersion` es la versión de la app.
