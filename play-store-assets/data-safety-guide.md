# BarberFlow — Guía Data Safety para Google Play Console

Esta sección se rellena manualmente en:
Play Console → App content → Data safety

---

## ¿La app recopila o comparte datos de usuario?
**Sí**

## ¿Todos los datos están cifrados en tránsito?
**Sí** (Firebase usa HTTPS/TLS)

## ¿El usuario puede solicitar que sus datos sean eliminados?
**Sí** — Disponible en Mi perfil → Eliminar cuenta (elimina cuenta Auth + todos los datos Firestore/Storage en 24h)

---

## Datos recopilados — Detalle por categoría

### 📍 Información personal
| Campo | ¿Se recopila? | ¿Compartido con terceros? | Finalidad | ¿Opcional? |
|---|---|---|---|---|
| Nombre | Sí | No | Funcionalidad de la app | No |
| Dirección de email | Sí | No | Autenticación | No |
| Foto de perfil | Sí | No | Funcionalidad de la app | Sí |

### 📞 Información financiera
| Campo | ¿Se recopila? | ¿Compartido? | Finalidad |
|---|---|---|---|
| Historial de transacciones (importes de citas/ventas) | Sí | No | Funcionalidad del POS y reportes |

### 📱 Actividad en la app
| Campo | ¿Se recopila? | ¿Compartido? | Finalidad |
|---|---|---|---|
| Historial de citas reservadas | Sí | No | Funcionalidad de la app |
| Interacciones en la app (citas, reseñas, puntos) | Sí | No | Programa de fidelización |
| Contenido generado (reseñas, fotos portfolio) | Sí | No | Funcionalidad de la app |

### 📲 Identificadores de dispositivo
| Campo | ¿Se recopila? | ¿Compartido? | Finalidad |
|---|---|---|---|
| ID de dispositivo (token push Expo/FCM) | Sí | Expo (Expo Push Service) | Notificaciones push |

---

## Prácticas de seguridad

✅ **Los datos están cifrados en tránsito** — Firebase usa HTTPS/TLS
✅ **El usuario puede solicitar la eliminación de sus datos** — Mediante "Eliminar cuenta" en la app
❌ **Los datos NO se venden a terceros**
❌ **Los datos NO se usan para publicidad**

---

## Cómo rellenar el formulario en Play Console (paso a paso)

### Paso 1: ¿Recopila datos tu app?
→ **Sí**

### Paso 2: ¿Se cifran los datos en tránsito?
→ **Sí**

### Paso 3: ¿Puede el usuario solicitar la eliminación?
→ **Sí**

### Paso 4: Tipos de datos — marcar los siguientes:

**Información personal:**
- [x] Nombre
- [x] Dirección de email
- [x] Fotos y vídeos (foto de perfil)

**Información financiera:**
- [x] Historial de compras

**Actividad en la app:**
- [x] Historial de búsqueda en la app
- [x] Otras acciones del usuario (citas, reseñas)

**Identificadores:**
- [x] ID de dispositivo u otros identificadores

### Paso 5: Para cada tipo de dato marcado, indicar:
- **Recopilado:** Sí
- **Compartido:** No (excepto tokens push → Expo)
- **Procesado de forma efímera:** No
- **Obligatorio/opcional:** Variable (ver tabla)
- **Finalidad:** "Funcionalidad de la app" para todos

---

## Resumen para el formulario de contenido de la app

### Clasificación de la app (IARC)
En Play Console → App content → App rating → Completar cuestionario IARC:
- Violencia: **Ninguna**
- Lenguaje soez: **Ninguno**
- Contenido sexual: **Ninguno**
- Sustancias: **Ninguna**
- Compras en la app: **No** (la tienda usa checkout externo, no Google Play Billing)
→ **Calificación esperada: PEGI 3 / Everyone**

### Audiencia objetivo
- **Edad mínima: 18 años** (barbería, entorno profesional)
- Esto evita las restricciones adicionales de apps para menores

### Anuncios
- **No muestra anuncios** → seleccionar "No"

### Acceso a la app (test credentials)
Play Store pedirá credenciales de prueba para que los revisores puedan usar la app:
- Email: `qa.client@barberflow.dev`
- Contraseña: `Testing123`
- Notas: "App de gestión de barbería. Rol cliente precargado con datos de demo."

---

## Checklist final antes de publicar

- [ ] Data safety rellenado en Play Console
- [ ] IARC questionnaire completado
- [ ] Capturas de pantalla subidas (mín. 2, recom. 6-8)
- [ ] Feature graphic subido (1024×500 px)
- [ ] Icono de la app en Play Store (512×512 PNG)
- [ ] Descripción corta (80 chars) ← ver listing-texts.md
- [ ] Descripción completa ← ver listing-texts.md
- [ ] Política de privacidad URL: https://barberflow-2026.web.app/privacy.html
- [ ] Credenciales de test para revisores
- [ ] AAB subido al track "internal"
- [ ] Revisar que versionCode=15 sea mayor que cualquier build anterior
