# Fase 1: Barber Profile & Portfolio - Testing Strategy

Documento que define la estrategia integral de testing para la Fase 1 del proyecto BarberFlow.

## Índice

1. [Overview](#overview)
2. [Testing Pyramid](#testing-pyramid)
3. [Unit Tests](#unit-tests)
4. [Integration Tests](#integration-tests)
5. [E2E Tests](#e2e-tests)
6. [Test Coverage Goals](#test-coverage-goals)
7. [Execution Plan](#execution-plan)
8. [Known Limitations](#known-limitations)

---

## Overview

La estrategia de testing de Fase 1 cubre:

- ✅ **Servicios (Services)**: `barberProfile.ts`, `barberReviews.ts`
- ✅ **Componentes (Components)**: `DashboardBarber`, `PortfolioPage`, `BarberProfileViewPage`, `CrearPerfilBarberPage`, `UploadFotoModal`
- ✅ **Firestore Rules**: `firestore.rules` (validación de permisos)
- ✅ **Storage Rules**: `storage.rules` (acceso a fotos)
- ✅ **Flujos de Usuario**: Onboarding completo, edición de perfil, carga de fotos

**No cubiertos en Fase 1** (Fase 2):
- Marketplace search y discovery
- Interacción barbero-dueño (ofertas)
- Integración de citas con perfil
- Notificaciones

---

## Testing Pyramid

```
        /\
       /  \
      / E2E \      <- End-to-End Tests (~10%)
     /      \         UI flows completos, interacciones de usuario
    /--------\
   /          \
  / Integration \   <- Integration Tests (~30%)
 /   Tests     \      Firestore, Storage, servicios + componentes
/              \
/================\
\  Unit Tests   /   <- Unit Tests (~60%)
 \            /        Funciones, lógica pura, casos aislados
  \          /
   \=========/
```

---

## Unit Tests

### 1. Services Tests

**Archivo**: `src/__tests__/services/barberProfile.test.ts`
**Framework**: Vitest (compatible con Jest)
**Coverage**: 80%+

#### barberProfile.ts Tests

```typescript
getBarberProfile(uid)
  ✓ Devuelve perfil cuando existe
  ✓ Devuelve null cuando no existe
  ✓ Maneja errores de Firestore

createBarberProfile(uid, data)
  ✓ Crea perfil con datos válidos
  ✓ Valida campos requeridos
  ✓ Establece timestamps
  ✓ Rechaza datos incompletos

updateBarberProfile(uid, data)
  ✓ Actualiza solo campos especificados
  ✓ Mantiene datos no modificados
  ✓ Actualiza timestamp de actualización
  ✓ Rechaza acceso no autorizado

updateAvailabilityStatus(uid, status)
  ✓ Cambia de disponible a no disponible
  ✓ Cambia de no disponible a disponible
  ✓ Valida estados válidos
  ✓ Actualiza timestamp

Portfolio Operations
  ✓ Carga foto de portafolio
  ✓ Elimina foto del portafolio
  ✓ Actualiza caption de foto
  ✓ Maneja fallos de Storage

getAvailableBarberProfiles(limit)
  ✓ Devuelve perfiles disponibles
  ✓ Respeta límite de resultados
  ✓ Ordena por rating (opcional)
  ✓ Filtra por estado

updateBarberRating(barberId)
  ✓ Calcula promedio de ratings
  ✓ Actualiza totalReviews
  ✓ Redondea a un decimal
```

**Archivo**: `src/__tests__/services/barberReviews.test.ts`
**Coverage**: 80%+

#### barberReviews.ts Tests

```typescript
createBarberReview(...)
  ✓ Crea reseña con datos válidos
  ✓ Valida rating 1-5
  ✓ Requiere comentario no vacío
  ✓ Vincula cliente y barbero
  ✓ Dispara recálculo de rating

getBarberReviews(barberId, limit)
  ✓ Obtiene todas las reseñas
  ✓ Respeta límite
  ✓ Ordena por fecha
  ✓ Devuelve array vacío si no hay

getRecentBarberReviews(barberId, limit)
  ✓ Devuelve últimas N reseñas
  ✓ Ordena descendente por fecha
  ✓ Incluye propiedades necesarias

updateBarberReview(reviewId, clientId, ...)
  ✓ Permite autor actualizar
  ✓ Rechaza acceso no autorizado
  ✓ Valida nuevo rating
  ✓ Actualiza timestamp

deleteBarberReview(reviewId, clientId)
  ✓ Permite autor eliminar
  ✓ Rechaza acceso no autorizado
  ✓ Dispara recálculo de rating

Rating Calculations
  ✓ Calcula promedio correctamente
  ✓ Redondea a un decimal
  ✓ Maneja un solo rating
```

### 2. Component Tests

**Archivo**: `src/__tests__/components/DashboardBarber.test.tsx`
**Framework**: React Testing Library (Vitest)
**Coverage**: 75%+

#### DashboardBarber Display Tests

```typescript
Datos Mostrados
  ✓ Saludo personalizado con nombre
  ✓ Ubicación (ciudad, provincia)
  ✓ Tarjeta de disponibilidad
  ✓ Foto de perfil
  ✓ Contacto e info

Stats Grid
  ✓ Cantidad de fotos de portafolio
  ✓ Calificación promedio
  ✓ Total de reseñas
  ✓ Años de experiencia
  ✓ Botones de acción

Profile Section
  ✓ Email del usuario
  ✓ Teléfono
  ✓ Especialidades como tags
  ✓ Idiomas como tags
  ✓ Botón editar perfil

Reviews Section
  ✓ Muestra reseñas recientes
  ✓ Rating de cada reseña
  ✓ Comentario de reseña
  ✓ Fecha de reseña
  ✓ Mensaje si no hay reseñas

Availability Toggle
  ✓ Muestra estado disponible
  ✓ Muestra botón toggle
  ✓ Desactiva botón durante update
  ✓ Colores distintos por estado

Social Links
  ✓ Muestra link Instagram si existe
  ✓ Muestra handle de Instagram
  ✓ Oculta sección si no hay Instagram

Quick Links
  ✓ Acceso a Citas
  ✓ Acceso a Mensajes
  ✓ Acceso a Ventas
```

---

## Integration Tests

### 1. Barber Onboarding Flow

**Archivo**: `src/__tests__/integration/barberOnboarding.integration.test.ts`
**Framework**: Vitest
**Scope**: Flujo completo de 7 pasos

#### Complete Profile Creation

```typescript
✓ Completa creación en 7 pasos
✓ Valida Paso 1: Datos Básicos
  - displayName (mínimo 2 palabras)
  - phone (+34...)
  - city, province, country

✓ Valida Paso 2: Info Profesional
  - yearsExperience (1-60)
  - specialties (mínimo 1)
  - languages (mínimo 1)
  - certifications

✓ Valida Paso 3: Redes Sociales
  - instagramHandle (@...)
  - instagramUrl (https://instagram.com/...)

✓ Valida Paso 4: Bio
  - length 10-500 chars

✓ Valida Paso 5: Foto
  - Tipo: JPEG, PNG, WebP
  - Tamaño: ≤50MB

✓ Valida Paso 6: Disponibilidad
  - Estados válidos: available, unavailable, in_negotiation

✓ Resumen en Paso 7
  - Review de todos los datos
```

#### Firestore Persistence

```typescript
✓ Guarda perfil en Firestore
✓ Establece timestamps (createdAt, updatedAt)
✓ Permite actualizar después de creación
✓ Mantiene consistencia de datos
```

#### Navigation Flow

```typescript
✓ Navega a /onboarding/crear-perfil-barbero
✓ Va a /barber-dashboard después de crear
✓ Opción de editar desde dashboard
✓ Acceso a Portfolio desde dashboard
```

#### Photo Upload

```typescript
✓ Permite seleccionar foto
✓ Valida tipo de archivo
✓ Valida tamaño máximo
✓ Muestra preview
✓ Guarda en Storage: barber_portfolios/{uid}/...
```

#### Error Handling

```typescript
✓ Muestra error si falla validación
✓ Permite volver atrás
✓ Maneja errores de Firestore
✓ Maneja errores de Storage
```

---

## E2E Tests

### 1. User Journey: Create Profile & Upload Photos

```gherkin
Feature: Barber Profile Creation

  Scenario: Complete barber onboarding
    Given Usuario es barbero autenticado
    When Navega a /onboarding/crear-perfil-barbero
    Then Ve formulario paso 1 (Datos Básicos)

    When Completa datos básicos
      | Field       | Value              |
      | displayName | Juan García López  |
      | phone       | +34612345678       |
      | city        | Madrid             |
      | province    | Madrid             |
    And Presiona "Siguiente"
    Then Ve paso 2 (Info Profesional)

    When Selecciona especialidades
      | Especialidad |
      | Degradados   |
      | Diseños      |
      | Afeitados    |
    And Ingresa años de experiencia: 5
    And Presiona "Siguiente"
    Then Ve paso 3 (Redes Sociales)

    When Ingresa @juanbarber en Instagram
    And Presiona "Siguiente"
    Then Ve paso 4 (Bio)

    When Ingresa bio
    And Presiona "Siguiente"
    Then Ve paso 5 (Foto de Perfil)

    When Sube foto desde galería
    And Presiona "Siguiente"
    Then Ve paso 6 (Disponibilidad)

    When Marca "Disponible"
    And Presiona "Siguiente"
    Then Ve paso 7 (Resumen)

    When Revisa datos en resumen
    And Presiona "Crear Perfil"
    Then Perfil se guarda en Firestore
    And Foto se carga en Storage
    And Navega a /barber-dashboard
    And Ve dashboard con datos ingresados
```

### 2. User Journey: View Public Profile

```gherkin
Scenario: Owner discovers barber profile
  Given Owner está autenticado
  When Navega a /barber-profile/{barberId}
  Then Ve información pública del barbero
    | Field                | Display      |
    | displayName          | Juan García  |
    | location             | Madrid       |
    | rating               | 4.8 ⭐       |
    | availability status  | Disponible   |
    | portfolio photos     | Galería      |
    | specialties          | Tags         |
    | recent reviews       | Últimas 10   |
```

---

## Test Coverage Goals

| Componente | Unit | Integration | E2E | Total |
|-----------|------|-------------|-----|-------|
| barberProfile.ts | 80% | 70% | 60% | 70% |
| barberReviews.ts | 80% | 70% | 60% | 70% |
| DashboardBarber.tsx | 75% | 70% | 60% | 68% |
| CrearPerfilBarberPage.tsx | 70% | 80% | 80% | 77% |
| PortfolioPage.tsx | 75% | 70% | 70% | 72% |
| BarberProfileViewPage.tsx | 75% | 65% | 65% | 68% |
| UploadFotoModal.tsx | 75% | 70% | 70% | 72% |
| firestore.rules | - | 90% | 80% | 85% |
| storage.rules | - | 90% | 80% | 85% |

**Meta General**: 75%+ de coverage combinado

---

## Execution Plan

### Phase 1: Unit Tests (Inmediato)
- [x] Crear barberProfile.test.ts
- [x] Crear barberReviews.test.ts
- [x] Crear DashboardBarber.test.tsx
- **Ejecución**: `npm test src/__tests__/services/`

### Phase 2: Integration Tests (Semana 1)
- [x] Crear barberOnboarding.integration.test.ts
- [x] Crear tests de Firestore rules
- [x] Crear tests de Storage rules
- **Ejecución**: `npm test src/__tests__/integration/`

### Phase 3: E2E Tests (Semana 2)
- [ ] Implementar con Cypress/Playwright
- [ ] Test de creación de perfil completo
- [ ] Test de ver perfil público
- [ ] Test de carga de fotos
- **Ejecución**: `npm run test:e2e`

### Phase 4: Manual Testing (Ongoing)
- [ ] QA manual en dispositivos reales
- [ ] Testing de flujos alternos
- [ ] Testing de casos edge

---

## Test Configuration

### Vitest Setup (package.json)

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "playwright": "^1.40.0"
  }
}
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
      ]
    }
  }
})
```

---

## Known Limitations

### Fase 1 Testing Scope

1. **Mocks de Firebase**: Los tests usan mocks de Firestore y Storage en lugar de conexión real
   - ✅ Apropiado para unit tests
   - ⚠️ Requiere testing en staging/production con Firebase real en Fase 2

2. **No hay E2E Automatizado**: Playwright/Cypress no implementado aún
   - ✅ Tests manuales + scripted flows cubriendo MVP
   - 📋 Configurar CI/CD para Fase 2

3. **No hay Mobile Testing**: Fase 1 solo para web-admin
   - 📋 Agregar testing móvil con Detox/Appium en Fase 2

4. **No hay Performance Testing**: Carga, velocidad, límites
   - 📋 Configurar Lighthouse/WebPageTest en Fase 2

---

## Próximos Pasos

1. **Instalar dependencias de testing**:
   ```bash
   npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event
   ```

2. **Configurar vitest.config.ts**

3. **Ejecutar tests**:
   ```bash
   npm test
   ```

4. **Ver cobertura**:
   ```bash
   npm run test:coverage
   ```

---

## Referencias

- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Playwright E2E](https://playwright.dev/)

