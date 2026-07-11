# Production Testing Checklist - Fase 1

**Fecha de Deploy**: 2026-07-11
**URL**: https://barberflow-2026.web.app
**Status**: ✅ LIVE

---

## 🎯 Pre-Testing

- [ ] Firebase Console accesible: https://console.firebase.google.com/project/barberflow-2026
- [ ] Firestore rules compiladas correctamente
- [ ] Storage rules compiladas correctamente
- [ ] Web hosting actualizado
- [ ] No hay errores en console (F12)

---

## 🔐 Security Rules Testing

### Firestore Rules
- [ ] **barber_profiles**: Lectura pública funciona
- [ ] **barber_profiles**: Solo barbero puede escribir su perfil
- [ ] **barber_profiles**: Otros usuarios no pueden editar
- [ ] **barber_profiles**: Eliminación bloqueada
- [ ] **barber_reviews**: Lectura pública funciona
- [ ] **barber_reviews**: Solo cliente puede crear reviews
- [ ] **barber_reviews**: Solo autor puede actualizar
- [ ] **barber_reviews**: Solo autor puede eliminar

### Storage Rules
- [ ] **barber_portfolios/{uid}**: Lectura pública funciona
- [ ] **barber_portfolios/{uid}**: Solo dueño puede subir
- [ ] **barber_portfolios/{uid}**: Solo dueño puede eliminar
- [ ] **Cross-user**: Usuario no puede ver/editar/eliminar fotos de otro

---

## 👤 User Flow: Barber Onboarding

### Login
- [ ] Login funciona en producción
- [ ] Auth context se sincroniza
- [ ] User UID se obtiene correctamente

### Step 1: Datos Básicos
- [ ] Formulario carga
- [ ] displayName acepta espacios y caracteres especiales
- [ ] phone valida formato +34...
- [ ] city/province autocomplete funciona
- [ ] Validación de campos requeridos
- [ ] Progreso muestra 1/7 (14%)

### Step 2: Info Profesional
- [ ] yearsExperience campo numérico
- [ ] specialties multi-select funciona
- [ ] languages multi-select funciona
- [ ] certifications opcional funciona
- [ ] Progreso muestra 2/7 (29%)

### Step 3: Redes Sociales
- [ ] Instagram handle optional
- [ ] Instagram URL valida formato
- [ ] Progreso muestra 3/7 (43%)

### Step 4: Bio
- [ ] Bio textarea funciona
- [ ] Validación 10-500 caracteres
- [ ] Contador de caracteres visible
- [ ] Progreso muestra 4/7 (57%)

### Step 5: Foto de Perfil
- [ ] Drag-drop zone funciona
- [ ] File picker funciona
- [ ] Preview se muestra
- [ ] Validación tipo archivo (JPEG/PNG/WebP)
- [ ] Validación tamaño máximo (50MB)
- [ ] Upload a Storage funciona
- [ ] Progreso muestra 5/7 (71%)

### Step 6: Disponibilidad
- [ ] Toggle buttons funciona
- [ ] Estados: available, unavailable, in_negotiation
- [ ] Estado se guarda
- [ ] Progreso muestra 6/7 (86%)

### Step 7: Resumen
- [ ] Todos los datos se muestran correctamente
- [ ] Botón "Crear Perfil" visible
- [ ] Progreso muestra 7/7 (100%)

### Guardar
- [ ] Documento se crea en Firestore: barber_profiles/{uid}
- [ ] Foto se guarda en Storage: barber_portfolios/{uid}/...
- [ ] Timestamps se establecen correctamente
- [ ] Redirige a /barber-dashboard después

---

## 📊 Dashboard Testing

### Al llegar al Dashboard
- [ ] Saludo personalizado con nombre
- [ ] Ubicación mostrada correctamente
- [ ] Disponibilidad badge mostrado (color correcto)
- [ ] Stats grid cargado (fotos, rating, experiencia)

### Disponibilidad Toggle
- [ ] Botón toggle funciona
- [ ] Estado se actualiza en Firestore
- [ ] Color cambia (verde/rojo)
- [ ] Texto cambia ("Disponible" / "No Disponible")
- [ ] No hay errores en console

### Perfil Section
- [ ] Email mostrado
- [ ] Teléfono mostrado
- [ ] Especialidades como tags
- [ ] Idiomas como tags
- [ ] Botón "Editar Perfil" funciona

### Reviews Section
- [ ] Sin reseñas: mensaje "Sin reseñas aún"
- [ ] Rating y fecha mostrados
- [ ] Comentarios visibles

### Quick Links
- [ ] "Citas" navega a /appointments
- [ ] "Mensajes" navega a /messages
- [ ] "Ventas" navega a /sales

---

## 🖼️ Portfolio Testing

### Galería
- [ ] Página carga correctamente
- [ ] Empty state si sin fotos
- [ ] Botón "Agregar Foto" funciona

### Upload Foto
- [ ] Modal abre al presionar botón
- [ ] Drag-drop funciona
- [ ] File picker funciona
- [ ] Preview funciona
- [ ] Caption editable
- [ ] Upload ejecuta
- [ ] Foto aparece en galería
- [ ] URL guardada en Firestore
- [ ] Archivo en Storage accesible

### Editar Caption
- [ ] Click en foto permite editar
- [ ] Guardar actualiza Firestore
- [ ] Caption se muestra actualizado

### Eliminar Foto
- [ ] Click en trash abre confirmación
- [ ] Confirmar elimina de Firestore
- [ ] Archivo eliminado de Storage
- [ ] Galería se actualiza

---

## 👀 Public Profile Testing

### Acceso a Perfil Público
- [ ] URL: /barber-profile/{barberId} carga
- [ ] Acceso sin login permite lectura
- [ ] Acceso por otros usuarios permitido

### Header
- [ ] Nombre barbero mostrado
- [ ] Ubicación mostrada
- [ ] Rating calculado correctamente
- [ ] Disponibilidad badge mostrado
- [ ] Colores correctos por estado

### Secciones
- [ ] About/Bio mostrado
- [ ] Professional info mostrado
- [ ] Specialties como tags
- [ ] Languages como tags
- [ ] Certifications listados
- [ ] Portfolio gallery funciona
- [ ] Fotos clickeables (modal)
- [ ] Reviews mostrados
- [ ] Instagram link funciona

---

## 🔄 Performance Testing

### Load Times
- [ ] /barber-dashboard: < 3s
- [ ] /portfolio: < 2s
- [ ] /barber-profile/{id}: < 3s

### Network
- [ ] No hay requests duplicados
- [ ] No hay 404s en console
- [ ] Firestore queries optimizadas
- [ ] Storage downloads rápidos

### Memory
- [ ] No hay memory leaks
- [ ] App responsivo después de 10 min

---

## 🐛 Error Handling

### Connection Errors
- [ ] Falla conexión Firestore → Error message
- [ ] Falla conexión Storage → Error message
- [ ] Retry button aparece
- [ ] Recuperación después de retry

### Validation Errors
- [ ] Campo vacío → Error message
- [ ] Formato inválido → Error message
- [ ] Tamaño excedido → Error message
- [ ] Mensaje desaparece al corregir

### Permission Errors
- [ ] Usuario no autorizado → Acceso denegado
- [ ] Intento de editar ajeno → Bloqueado
- [ ] Intento de eliminar ajeno → Bloqueado

---

## 📱 Responsive Design

### Mobile (320px)
- [ ] Formulario legible
- [ ] Inputs accesibles
- [ ] Botones clickeables
- [ ] Galería grid adapta
- [ ] No overflow horizontal

### Tablet (768px)
- [ ] Layout óptimo
- [ ] Stats grid 2 columnas
- [ ] Galería 2-3 columnas

### Desktop (1920px)
- [ ] Stats grid 3+ columnas
- [ ] Galería 4+ columnas
- [ ] Espaciado óptimo

---

## 🎨 Visual Testing

### Colors
- [ ] Gold accent (#c9a84c) consistente
- [ ] Dark theme funcionando
- [ ] Badges: Green (available), Red (unavailable)

### Fonts & Typography
- [ ] Títulos legibles
- [ ] Texto cuerpo confortable
- [ ] Tags bien formateados

### Images
- [ ] Fotos se cargan correctamente
- [ ] No hay quebradas
- [ ] Previews se muestran
- [ ] Lightbox funciona

---

## 📋 Final Checklist

- [ ] Todos los tests unitarios pasando
- [ ] Build sin errores de TypeScript
- [ ] No hay errores de console en producción
- [ ] Firestore rules funcionando
- [ ] Storage rules funcionando
- [ ] Todos los flujos de usuario completados
- [ ] Performance acceptable (< 3s loads)
- [ ] Sin data corruption
- [ ] Sin security issues
- [ ] Documentación actualizada

---

## 📝 Bugs Encontrados

| # | Descripción | Severidad | Estado |
|---|-------------|-----------|--------|
| | | | |

---

## ✅ Sign-Off

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| QA | - | - | - |
| Dev | - | - | - |
| PM | - | - | - |

---

**Status Final**: 🟡 Pendiente Testing Manual
**Fecha Último Update**: 2026-07-11
**Next Review**: 2026-07-12

