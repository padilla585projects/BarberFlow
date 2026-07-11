# Fase 1: E2E Test Scenarios

Documento que detalla los escenarios de end-to-end para testing manual y automatizado de Fase 1.

## Tabla de Contenidos

1. [Test Scenarios](#test-scenarios)
2. [Critical User Paths](#critical-user-paths)
3. [Edge Cases](#edge-cases)
4. [Data Validation](#data-validation)
5. [Performance Checkpoints](#performance-checkpoints)

---

## Test Scenarios

### Scenario 1: Happy Path - Complete Barber Onboarding

**Objetivo**: Crear un perfil de barbero completo desde cero

**Precondiciones**:
- Usuario está autenticado como barbero
- Acceso a /onboarding/creator-perfil-barbero disponible
- Navegador moderno con soporte para upload de archivos

**Pasos**:

| # | Paso | Acción | Resultado Esperado |
|---|------|--------|-------------------|
| 1 | Navegar | Ir a `/onboarding/crear-perfil-barbero` | Carga formulario Paso 1 |
| 2 | Ver | Verificar barra de progreso | Muestra 1/7 (14%) |
| 3 | Completar Paso 1 | Ingresar: |  |
|   | | - displayName: "Juan Carlos García López" | Campo aceptado |
|   | | - phone: "+34612345678" | Formato válido |
|   | | - city: "Madrid" | Autocomplete funciona |
|   | | - province: "Madrid" | Autocomplete funciona |
|   | | - country: "España" | Pre-seleccionado |
| 4 | Validar | Presionar "Siguiente" | Pasa validación, va a Paso 2 |
| 5 | Ver | Verificar barra de progreso | Muestra 2/7 (29%) |
| 6 | Completar Paso 2 | Ingresar: |  |
|   | | - yearsExperience: 5 | Input numérico funciona |
|   | | - specialties: Degradados, Diseños, Afeitados | Multi-select funciona |
|   | | - certifications: Corte Profesional, Barbería Clásica | Multi-select funciona |
|   | | - languages: Español, Inglés | Multi-select funciona |
| 7 | Validar | Presionar "Siguiente" | Pasa validación, va a Paso 3 |
| 8 | Ver | Verificar barra de progreso | Muestra 3/7 (43%) |
| 9 | Completar Paso 3 | Ingresar: |  |
|   | | - instagramHandle: "@juanbarber" | Acepta @ |
|   | | - instagramUrl: "https://instagram.com/juanbarber" | URL válida |
| 10 | Validar | Presionar "Siguiente" | Pasa validación, va a Paso 4 |
| 11 | Ver | Verificar barra de progreso | Muestra 4/7 (57%) |
| 12 | Completar Paso 4 | Ingresar bio: |  |
|   | | "Barbero profesional con 5 años de experiencia. Especializado en cortes modernos y clásicos. Atiendo en Madrid zona norte." | Acepta 200+ caracteres |
| 13 | Validar | Presionar "Siguiente" | Pasa validación, va a Paso 5 |
| 14 | Ver | Verificar barra de progreso | Muestra 5/7 (71%) |
| 15 | Completar Paso 5 | Seleccionar foto de profilio |  |
|   | | - Hacer clic en zona de upload | Abre dialog de archivo |
|   | | - Seleccionar imagen JPG (2MB) | Archivo se carga en preview |
|   | | - Verificar preview | Imagen se muestra |
| 16 | Validar | Presionar "Siguiente" | Foto se valida, va a Paso 6 |
| 17 | Ver | Verificar barra de progreso | Muestra 6/7 (86%) |
| 18 | Completar Paso 6 | Seleccionar disponibilidad |  |
|   | | - Click en botón "Disponible" | Botón queda activo/seleccionado |
|   | | - Verificar etiqueta | Muestra "✅ Disponible" |
| 19 | Validar | Presionar "Siguiente" | Disponibilidad se valida, va a Paso 7 |
| 20 | Ver | Verificar barra de progreso | Muestra 7/7 (100%) |
| 21 | Revisar Resumen | Ver todos los datos ingresados: |  |
|   | | - Datos básicos | Mostrados correctamente |
|   | | - Info profesional | Mostrados correctamente |
|   | | - Redes sociales | Mostrados correctamente |
|   | | - Bio | Mostrados correctamente |
|   | | - Foto | Preview mostrado |
|   | | - Disponibilidad | Mostrada correctamente |
| 22 | Completar | Presionar "Crear Perfil" | Perfil se guarda |
| 23 | Verificar Guardado | | Loading spinner muestra |
| 24 | Redirección | | Navega a `/barber-dashboard` |
| 25 | Ver Dashboard | | Dashboard carga con datos ingresados |
| 26 | Verificar Datos | En dashboard: |  |
|   | | - Nombre en saludo | "👋 Bienvenido, Juan Carlos García López" |
|   | | - Ubicación | "Madrid, Madrid" |
|   | | - Disponibilidad | "✅ Disponible para Trabajar" |
|   | | - Stats | Fotos: 0, Rating: 0, Experiencia: 5 años |
|   | | - Perfil | Email, teléfono, especialidades, idiomas |
|   | | - Instagram | Link visible y funcional |

**Resultado Final**: ✅ Perfil creado exitosamente
**Tiempo Esperado**: 3-5 minutos
**Plataformas**: Web (Chrome, Firefox, Safari)

---

### Scenario 2: Upload Portfolio Photos After Onboarding

**Objetivo**: Subir fotos de portafolio después de crear perfil

**Precondiciones**:
- Barbero tiene perfil creado
- Está en `/portfolio` page
- Acceso a galería o archivos locales

**Pasos**:

| # | Paso | Acción | Resultado Esperado |
|---|------|--------|-------------------|
| 1 | Navegar | Ir a `/portfolio` | Carga PortfolioPage |
| 2 | Ver Estado Inicial | | Muestra "Sin fotos aún" o galería vacía |
| 3 | Agregar Foto | Presionar "Agregar Foto +" | Abre UploadFotoModal |
| 4 | Seleccionar Archivo | Click en zona de drag-drop | Abre file picker |
| 5 | | Seleccionar image.jpg (3MB) | Archivo aparece en preview |
| 6 | Agregar Caption | Ingresar caption: "Degradado clásico con líneas" | Texto ingresado |
| 7 | Validar Caption | Verificar contador de caracteres | Muestra "28/150" |
| 8 | Subir | Presionar "Subir Foto" | Loading spinner aparece |
| 9 | Verificar Upload | | Barra de progreso muestra |
| 10 | Foto Guardada | | Foto aparece en galería con caption |
| 11 | Verificar Storage | | Archivo en barber_portfolios/{uid}/... |
| 12 | Verificar Firestore | | URL guardada en portfolio.photos array |
| 13 | Agregar Segunda Foto | Presionar "Agregar Foto +" nuevamente | Modal se abre |
| 14 | | Seleccionar segunda imagen | Archivo cargado |
| 15 | | Ingresar caption: "Diseño con letras" | Caption ingresado |
| 16 | | Presionar "Subir" | Segunda foto sube |
| 17 | Ver Galería | | Muestra 2 fotos en galería |
| 18 | Editar Caption | Click en foto, editar caption | Modal de edición abre |
| 19 | | Cambiar a "Degradado con diseño" | Nuevo texto |
| 20 | | Presionar "Guardar" | Caption se actualiza |
| 21 | Eliminar Foto | Click en icono trash | Diálogo de confirmación |
| 22 | | Confirmar eliminación | Foto se elimina de galería |
| 23 | Verificar Datos | Ir a `/barber-dashboard` | Stats muestra "Fotos de Portfolio: 1" |

**Resultado Final**: ✅ Fotos de portafolio cargadas correctamente
**Tiempo Esperado**: 5-8 minutos
**Plataformas**: Web (Chrome, Firefox)

---

### Scenario 3: View Public Barber Profile

**Objetivo**: Ver perfil público de barbero (como dueño/cliente)

**Precondiciones**:
- Barbero con perfil completo existe
- Usuario es dueño o cliente autenticado
- Conocer barberId del barbero

**Pasos**:

| # | Paso | Acción | Resultado Esperado |
|---|------|--------|-------------------|
| 1 | Navegar | Ir a `/barber-profile/{barberId}` | Carga BarberProfileViewPage |
| 2 | Ver Header | | Se muestra: nombre, ubicación, rating, disponibilidad |
| 3 | | Nombre mostrado | "Juan García" |
| 4 | | Ubicación | "📍 Madrid, Madrid" |
| 5 | | Rating | "⭐ 4.8 (12 reseñas)" |
| 6 | | Disponibilidad | "✅ Disponible" (badge verde) |
| 7 | Ver Sección About | | Muestra bio del barbero |
| 8 | Ver Sección Professional | | Muestra: |
|   | | - Años de experiencia | "5 años" |
|   | | - Especialidades | Tags: Degradados, Diseños, Afeitados |
|   | | - Idiomas | Tags: Español, Inglés |
|   | | - Certificaciones | Listed items |
| 9 | Ver Portafolio | | Galería de fotos en grid |
| 10 | | Cantidad de fotos | Se muestran todas las fotos |
| 11 | Click Foto | | Abre lightbox/modal con imagen full-size |
| 12 | Ver Caption | En modal | Caption se muestra debajo |
| 13 | Cerrar Modal | Click fuera o X | Modal se cierra |
| 14 | Ver Reseñas | | Mostrada sección de reseñas |
| 15 | | Cantidad | Muestra "Últimas 10 reseñas" o cantidad actual |
| 16 | | Primera reseña | Rating: ⭐⭐⭐⭐⭐, fecha, comentario |
| 17 | Ver Instagram | | Link a Instagram funcional |
| 18 | | Click en link | Abre Instagram en nueva pestaña |

**Resultado Final**: ✅ Perfil público visible correctamente
**Tiempo Esperado**: 1-2 minutos
**Plataformas**: Web (Chrome, Firefox, Safari)

---

### Scenario 4: Edit Existing Barber Profile

**Objetivo**: Modificar datos de perfil existente

**Precondiciones**:
- Barbero con perfil creado
- Está en `/barber-dashboard`
- Datos iniciales diferentes a nuevos datos

**Pasos**:

| # | Paso | Acción | Resultado Esperado |
|---|------|--------|-------------------|
| 1 | Click Editar | En dashboard, click "✏️ Editar Perfil" | Navega a `/onboarding/crear-perfil-barbero?edit=true` |
| 2 | Ver Paso 1 | | Forma cargada con datos existentes |
| 3 | | displayName | "Juan García" (pre-relleno) |
| 4 | | phone | "+34612345678" (pre-relleno) |
| 5 | Modificar Nombre | Cambiar a "Juan Carlos García López" | Campo modificable |
| 6 | Siguiente | Presionar "Siguiente" | Pasa a Paso 2 |
| 7 | Ver Paso 2 | | Datos de experiencia pre-rellenos |
| 8 | | yearsExperience | "5" (pre-relleno) |
| 9 | | specialties | Degradados, Diseños, Afeitados (pre-seleccionados) |
| 10 | Modificar | Agregar "Afeitados Retro" a specialties | Nuevo item agregado |
| 11 | Siguiente | Continuar pasos | Pasa al resto de pasos |
| 12 | Verificar Datos | En Paso 7 (Resumen) | Cambios mostrados |
| 13 | Guardar | Presionar "Actualizar Perfil" | Perfil se actualiza |
| 14 | Redirección | | Navega a `/barber-dashboard` |
| 15 | Verificar Cambios | En dashboard | Nombre actualizado en saludo |
| 16 | | Especialidades | Nueva especialidad agregada |

**Resultado Final**: ✅ Perfil actualizado correctamente
**Tiempo Esperado**: 3-5 minutos
**Plataformas**: Web

---

## Critical User Paths

Estos son los flujos que **DEBEN** funcionar sin errores:

### Path 1: Barber → Create Profile → View Dashboard
```
Login (Barber) 
  ↓
/onboarding/barber (mostrar 3 tabs)
  ↓
Click "Mi perfil primero"
  ↓
/onboarding/crear-perfil-barbero
  ↓
7-step form completion
  ↓
Submit
  ↓
/barber-dashboard ← FINAL (Datos correctos)
```

### Path 2: Barber → Upload Photos → View Portfolio
```
Barber en Dashboard
  ↓
Click "Ver Portfolio"
  ↓
/portfolio (vacío inicialmente)
  ↓
Click "Agregar Foto"
  ↓
Upload foto + caption
  ↓
/portfolio ← FINAL (Foto visible)
```

### Path 3: Owner → Search Barber → View Profile
```
Owner autenticado
  ↓
Acceso a buscar barberos (Fase 2)
  ↓
Click en barbero
  ↓
/barber-profile/{barberId} ← FINAL (Perfil visible)
```

---

## Edge Cases

### Edge Case 1: Maximum File Size Upload
**Escenario**: Usuario intenta subir foto > 50MB
**Pasos**:
1. En `/portfolio`, presionar "Agregar Foto"
2. Seleccionar archivo de 51MB
3. **Resultado Esperado**: Mensaje de error "Archivo muy grande (máx 50MB)"

### Edge Case 2: Invalid Image Format
**Escenario**: Usuario intenta subir PDF en lugar de imagen
**Pasos**:
1. En `/portfolio`, presionar "Agregar Foto"
2. Seleccionar archivo.pdf
3. **Resultado Esperado**: Mensaje "Formato no válido. Usa JPG, PNG o WebP"

### Edge Case 3: Empty Form Submission
**Escenario**: Usuario intenta avanzar sin completar campos requeridos
**Pasos**:
1. En Paso 1, dejar displayName vacío
2. Presionar "Siguiente"
3. **Resultado Esperado**: Error highlight en campo + mensaje "Campo requerido"

### Edge Case 4: Duplicate Photo Upload
**Escenario**: Usuario intenta subir misma foto dos veces
**Pasos**:
1. Subir photo1.jpg
2. Intentar subir photo1.jpg nuevamente
3. **Resultado Esperado**: Se permite (diferentes IDs), o advertencia de duplicado

### Edge Case 5: Network Error During Upload
**Escenario**: Conexión pierde durante carga de foto
**Pasos**:
1. Iniciar carga de foto
2. Desconectar internet (o simular en DevTools)
3. **Resultado Esperado**: Mensaje de error "Error de conexión. Reintentando..." + retry button

### Edge Case 6: Rapid Availability Toggle
**Escenario**: Usuario alterna disponibilidad muy rápido
**Pasos**:
1. En dashboard, presionar toggle disponibilidad 5 veces rápidamente
2. **Resultado Esperado**: Última acción es la que prevalece, sin errores de sincronización

### Edge Case 7: Very Long Bio Text
**Escenario**: Bio con 500 caracteres máximo
**Pasos**:
1. En Paso 4, ingresar bio con exactamente 500 caracteres
2. Presionar "Siguiente"
3. **Resultado Esperado**: Acepta, pasa validación

### Edge Case 8: Special Characters in Names
**Escenario**: Nombre con caracteres especiales (ñ, accents)
**Pasos**:
1. En Paso 1, ingresar "José María García-López"
2. Presionar "Siguiente"
3. **Resultado Esperado**: Acepta caracteres especiales, guarda correctamente

---

## Data Validation

### Field Validation Rules

| Campo | Tipo | Requerido | Min | Max | Patrón | Validación |
|-------|------|----------|-----|-----|--------|-----------|
| displayName | String | ✅ | 2 | 100 | [a-zA-Z\s] | Mínimo 2 palabras |
| phone | String | ✅ | 9 | 20 | ^\+\d{1,3} | Formato internacional |
| city | String | ✅ | 2 | 50 | - | No vacío |
| province | String | ✅ | 2 | 50 | - | No vacío |
| yearsExperience | Number | ✅ | 0 | 60 | - | Entero positivo |
| specialties | Array | ✅ | 1 | 10 | - | Mínimo 1 item |
| languages | Array | ✅ | 1 | 10 | - | Mínimo 1 item |
| certifications | Array | ❌ | 0 | 20 | - | Opcional |
| bio | String | ✅ | 10 | 500 | - | 10-500 caracteres |
| instagramHandle | String | ❌ | 1 | 30 | ^@\w+ | Comienza con @ |
| instagramUrl | String | ❌ | 1 | 255 | https://instagram.com/ | URL válida |
| availability.status | Enum | ✅ | - | - | available/unavailable/in_negotiation | Solo valores válidos |

### Test Cases por Campo

#### displayName
- ✅ "Juan García" (válido)
- ✅ "María José López Martínez" (válido)
- ✅ "José María" (válido, con accent)
- ❌ "Juan" (inválido, menos de 2 palabras)
- ❌ "" (vacío)
- ❌ "Juan123" (números)

#### phone
- ✅ "+34612345678"
- ✅ "+34 612 345 678" (con espacios)
- ❌ "612345678" (sin país)
- ❌ "34612345678" (sin +)

#### bio
- ✅ "Barbero profesional con 5 años de experiencia" (válido)
- ✅ 500 caracteres exactos (válido)
- ❌ "Barbero" (menos de 10 caracteres)
- ❌ 501 caracteres (más de máximo)

---

## Performance Checkpoints

### Load Times

| Acción | Esperado | Máximo Aceptable |
|--------|----------|-----------------|
| Carga /onboarding/crear-perfil-barbero | 1s | 3s |
| Carga /barber-dashboard | 1.5s | 3s |
| Carga /portfolio | 1s | 2s |
| Carga /barber-profile/{id} | 1.5s | 3s |

### Upload Performance

| Acción | Esperado | Máximo Aceptable |
|--------|----------|-----------------|
| Upload foto 2MB | 2-3s | 10s |
| Upload foto 5MB | 5-7s | 15s |
| Upload foto 10MB | 10-15s | 25s |

### Render Performance

| Componente | FPS | Smooth |
|-----------|-----|--------|
| Gallery scroll (20 fotos) | 60fps | ✅ |
| Form input | 60fps | ✅ |
| Modal transitions | 60fps | ✅ |
| Availability toggle | 60fps | ✅ |

---

## Post-Test Checklist

Después de completar todos los scenarios:

- [ ] Todos los datos ingresados se guardaron correctamente en Firestore
- [ ] Todas las fotos se cargaron correctamente en Storage
- [ ] Todos los permisos (Firestore + Storage rules) funcionaron
- [ ] No hay errores en console (Chrome DevTools)
- [ ] Disponibilidad toggle funciona bidireccional
- [ ] Perfiles públicos muestran datos correctos
- [ ] Navegación no tiene broken links
- [ ] Estilos CSS responsive funcionan en mobile (320px)
- [ ] Estilos CSS responsive funcionan en tablet (768px)
- [ ] Estilos CSS responsive funcionan en desktop (1920px)

---

## Reporte de Resultados

Después de testing, completar:

```markdown
# Test Execution Report - Fase 1

**Fecha**: YYYY-MM-DD
**Tester**: [Nombre]
**Plataforma**: [Chrome/Firefox/Safari]
**OS**: [Windows/Mac/Linux]

## Scenario Results

| Scenario | Status | Notas |
|----------|--------|-------|
| Happy Path Onboarding | ✅/⚠️/❌ | |
| Upload Photos | ✅/⚠️/❌ | |
| View Public Profile | ✅/⚠️/❌ | |
| Edit Profile | ✅/⚠️/❌ | |

## Issues Found

- [ ] Issue 1: [Descripción]
- [ ] Issue 2: [Descripción]

## Performance Results

| Metric | Result | Status |
|--------|--------|--------|
| Load Time | Xs | ✅/⚠️/❌ |
| Upload Time | Xs | ✅/⚠️/❌ |

## Conclusion

[Resumen general del testing]
```

