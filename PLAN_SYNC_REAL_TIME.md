# 🚀 PLAN: Sincronización en Tiempo Real - Fase 1

## Objetivo
Reemplazar todas las queries estáticas (`getDoc()`, `getDocs()`) con listeners activos (`onSnapshot()`) para que cambios en Firestore se reflejen INMEDIATAMENTE en todas las apps (cliente, barbero, dueño, web-admin).

---

## 📊 Estado Actual vs. Deseado

| Sistema | Actual | Deseado | Impacto |
|---------|--------|---------|---------|
| **Stock** | `getDoc()` (una vez) | `onSnapshot()` (tiempo real) | Cliente ve agotamientos al instante |
| **Loyalty Points** | `getDoc()` (una vez) | `onSnapshot()` (tiempo real) | Cliente ve puntos ganados/perdidos al instante |
| **Orders** | `getDocs()` (una vez) | `onSnapshot()` (tiempo real) | Cliente ve estado pedido en vivo |
| **Barber Schedule** | `getDoc()` (una vez) | `onSnapshot()` (tiempo real) | Cliente ve disponibilidad actualizada |
| **Services** | `getDoc()` (una vez) | `onSnapshot()` (tiempo real) | Cliente ve cambios de precio/duración al instante |

---

## 🔧 CAMBIOS POR ARCHIVO

### **1. STOCK DE PRODUCTOS**

#### 1.1 ShopScreen.tsx - Agregar listener a productos
**Ruta:** `mobile/src/screens/client/ShopScreen.tsx`  
**Línea actual:** 88 (usa `getDocs()`)

**Cambio:**
```typescript
// ANTES (estático):
const snap = await getDocs(q);
const data = snap.docs.map(...);
setProducts(data);

// DESPUÉS (tiempo real):
const unsubscribe = onSnapshot(q, (snap) => {
  const data = snap.docs.map(...);
  setProducts(data);
});

// Cleanup en useEffect:
return () => unsubscribe?.();
```

#### 1.2 ProductDetailScreen.tsx - Agregar listener al producto individual
**Ruta:** `mobile/src/screens/client/ProductDetailScreen.tsx`  
**Línea actual:** 72 (lee `product.stock`)

**Cambio:**
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, 'products', productId),
    (snap) => {
      if (snap.exists()) {
        setProduct(snap.data() as Product);
      }
    }
  );
  return () => unsubscribe();
}, [productId]);
```

---

### **2. LOYALTY POINTS**

#### 2.1 HomeScreen.tsx - Agregar listener a loyalty points
**Ruta:** `mobile/src/screens/client/HomeScreen.tsx`  
**Línea actual:** 33-45 (usa `getDoc()`)

**Cambio:**
```typescript
useEffect(() => {
  const user = auth.currentUser;
  if (!user) return;

  // Escuchar cambios en tiempo real
  const unsubscribe = onSnapshot(
    doc(db, 'users', user.uid),
    (snap) => {
      if (snap.exists()) {
        const userData = snap.data();
        setLoyaltyPoints(userData?.loyaltyPoints ?? 0);
      }
    }
  );

  return () => unsubscribe();
}, []);
```

#### 2.2 LoyaltyScreen.tsx - Agregar listener
**Ruta:** `mobile/src/screens/client/LoyaltyScreen.tsx`  
**Línea actual:** 89 (usa `getDoc()`)

**Cambio:**
```typescript
useEffect(() => {
  const user = auth.currentUser;
  if (!user) return;

  const unsubscribe = onSnapshot(
    doc(db, 'users', user.uid),
    (snap) => {
      if (snap.exists()) {
        setPoints(snap.data()?.loyaltyPoints ?? 0);
      }
    }
  );

  return () => unsubscribe();
}, []);
```

---

### **3. ORDERS (Pedidos)**

#### 3.1 OrderHistoryScreen.tsx - Agregar listener a órdenes
**Ruta:** `mobile/src/screens/client/OrderHistoryScreen.tsx`  
**Línea actual:** 220-230 (usa `getDocs()`)

**Cambio:**
```typescript
useEffect(() => {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    collection(db, 'orders'),
    where('clientId', '==', user.uid),
    orderBy('createdAt', 'desc'),
  );

  // Cambiar de getDocs a onSnapshot
  const unsubscribe = onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setOrders(data);
    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

#### 3.2 web-admin: OrdersPage.tsx - Agregar listener
**Ruta:** `web-admin/src/pages/owner/OrdersPage.tsx`  
**Línea actual:** 87-95 (usa `getDocs()`)

**Cambio:**
```typescript
useEffect(() => {
  const shopId = activeBarbershop?.id;
  if (!shopId) return;

  const q = query(
    collection(db, 'orders'),
    where('barbershopId', '==', shopId),
    orderBy('createdAt', 'desc'),
  );

  // Cambiar a onSnapshot
  const unsubscribe = onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
    setOrders(orders);
  });

  return () => unsubscribe();
}, [activeBarbershop?.id]);
```

---

### **4. BARBER SCHEDULE (Horario del Barbero)**

#### 4.1 BookScreen.tsx - Agregar listener a horario
**Ruta:** `mobile/src/screens/client/BookScreen.tsx`  
**Línea actual:** 454-471 (usa `getDoc()`)

**Cambio:**
```typescript
useEffect(() => {
  if (!selectedBarber) return;

  const unsubscribe = onSnapshot(
    doc(db, 'users', selectedBarber.uid, 'schedule', 'config'),
    (snap) => {
      if (snap.exists()) {
        setBarberSchedule(snap.data() as BarberSchedule);
      }
    }
  );

  return () => unsubscribe();
}, [selectedBarber?.uid]);
```

#### 4.2 BarberScheduleScreen.tsx - Agregar listener
**Ruta:** `mobile/src/screens/barber/BarberScheduleScreen.tsx`  
**Línea actual:** 131-132 (usa `getDoc()`)

**Cambio:**
```typescript
useEffect(() => {
  const user = auth.currentUser;
  if (!user) return;

  const unsubscribe = onSnapshot(
    doc(db, 'users', user.uid, 'schedule', 'config'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ScheduleData;
        setWeeklyHours(data.weeklyHours);
        setDaysOff(data.daysOff);
      }
    }
  );

  return () => unsubscribe();
}, []);
```

---

### **5. SERVICES (Servicios)**

#### 5.1 BookScreen.tsx - Agregar listener a servicios
**Ruta:** `mobile/src/screens/client/BookScreen.tsx`  
**Línea actual:** 384 (usa `getDoc()`)

**Cambio:**
```typescript
useEffect(() => {
  if (!barbershopId) return;

  const unsubscribe = onSnapshot(
    doc(db, 'barbershops', barbershopId),
    (snap) => {
      if (snap.exists()) {
        const services = snap.data().services ?? [];
        setServices(services);
      }
    }
  );

  return () => unsubscribe();
}, [barbershopId]);
```

#### 5.2 ShopServicesScreen.tsx (mobile) - Agregar listener
**Ruta:** `mobile/src/screens/owner/ShopServicesScreen.tsx`  
**Línea actual:** 54 (usa `getDoc()`)

**Cambio:**
```typescript
useEffect(() => {
  if (!activeBarbershopId) return;

  const unsubscribe = onSnapshot(
    doc(db, 'barbershops', activeBarbershopId),
    (snap) => {
      if (snap.exists()) {
        setServices(snap.data().services ?? []);
      }
    }
  );

  return () => unsubscribe();
}, [activeBarbershopId]);
```

#### 5.3 ServicesPage.tsx (web-admin) - Agregar listener
**Ruta:** `web-admin/src/pages/owner/ServicesPage.tsx`  
**Línea actual:** 33-34 (usa `getBarbershopById()`)

**Cambio:**
```typescript
useEffect(() => {
  if (!selectedShop?.id) return;

  const unsubscribe = onSnapshot(
    doc(db, 'barbershops', selectedShop.id),
    (snap) => {
      if (snap.exists()) {
        setServices(snap.data().services ?? []);
      }
    }
  );

  return () => unsubscribe();
}, [selectedShop?.id]);
```

---

## 📋 ORDEN DE IMPLEMENTACIÓN (Priorizado)

```
PASO 1: Stock (Crítico para Shop)
  ├─ ShopScreen.tsx
  └─ ProductDetailScreen.tsx

PASO 2: Loyalty Points (Crítico para cliente)
  ├─ HomeScreen.tsx
  └─ LoyaltyScreen.tsx

PASO 3: Orders (Crítico para seguimiento)
  ├─ OrderHistoryScreen.tsx (mobile)
  └─ OrdersPage.tsx (web-admin)

PASO 4: Barber Schedule (Crítico para disponibilidad)
  ├─ BookScreen.tsx (cliente ve disponibilidad)
  └─ BarberScheduleScreen.tsx (barbero edita)

PASO 5: Services (Crítico para precios/duración)
  ├─ BookScreen.tsx (cliente ve servicios)
  ├─ ShopServicesScreen.tsx (mobile owner)
  └─ ServicesPage.tsx (web-admin)
```

---

## ✅ CAMBIOS NECESARIOS RESUMIDOS

### En Mobile (`mobile/src`)

| Archivo | Cambio | Línea |
|---------|--------|-------|
| `screens/client/ShopScreen.tsx` | `getDocs → onSnapshot` | 88 |
| `screens/client/ProductDetailScreen.tsx` | Agregar `onSnapshot` | 72 |
| `screens/client/HomeScreen.tsx` | `getDoc → onSnapshot` | 39 |
| `screens/client/LoyaltyScreen.tsx` | `getDoc → onSnapshot` | 89 |
| `screens/client/OrderHistoryScreen.tsx` | `getDocs → onSnapshot` | 230 |
| `screens/client/BookScreen.tsx` | `getDoc → onSnapshot` (horario + servicios) | 384, 454 |
| `screens/barber/BarberScheduleScreen.tsx` | `getDoc → onSnapshot` | 131 |
| `screens/owner/ShopServicesScreen.tsx` | `getDoc → onSnapshot` | 54 |

### En Web-Admin (`web-admin/src`)

| Archivo | Cambio | Línea |
|---------|--------|-------|
| `pages/owner/OrdersPage.tsx` | `getDocs → onSnapshot` | 87-95 |
| `pages/owner/ServicesPage.tsx` | `getBarbershopById → onSnapshot` | 33 |

---

## 🧪 TESTING DESPUÉS DE IMPLEMENTAR

### Scenario 1: Stock Real-Time
1. Abre app cliente en dispositivo A (ShopScreen)
2. Desde web-admin, cambia stock de producto (ej: 10 → 5)
3. ✅ Dispositivo A ve cambio inmediatamente (sin refresh)

### Scenario 2: Loyalty Points Real-Time
1. Cliente abierto en HomeScreen (dispositivo A)
2. Completa cita → Cloud Function suma puntos
3. ✅ Dispositivo A ve puntos actualizados sin refresh

### Scenario 3: Orders Real-Time
1. Cliente ve OrderHistoryScreen (dispositivo A, orden en estado `pending`)
2. Web-admin cambia estado a `shipped`
3. ✅ Dispositivo A ve estado actualizado sin refresh

### Scenario 4: Barber Schedule Real-Time
1. Cliente en BookScreen selecciona barbero (dispositivo A)
2. Barbero en M9 actualiza horario (ej: cierra a las 18:00 en lugar de 20:00)
3. ✅ Dispositivo A ve disponibilidad actualizada sin refresh

### Scenario 5: Services Real-Time
1. Cliente en BookScreen (dispositivo A)
2. Dueño en web-admin cambia precio de servicio (ej: 15.00 → 18.00)
3. ✅ Dispositivo A ve precio nuevo sin refresh

---

## 🔐 FIRESTORE RULES (Verificar que sean correctas)

Para que `onSnapshot()` funcione, las reglas deben permitir lectura:

```firestore
match /products/{document=**} {
  allow read: if request.auth != null;
}

match /users/{uid} {
  allow read: if request.auth.uid == uid;
}

match /orders/{document=**} {
  allow read: if request.auth.uid == resource.data.clientId 
           || resource.data.barbershopId in getUserBarbershops(request.auth.uid);
}

match /barbershops/{document=**} {
  allow read: if true; // Públicas
}
```

---

## 🚀 Implementación (SIGUIENTES PASOS)

1. **Paso 1:** Implementar Stock (ShopScreen + ProductDetailScreen)
2. **Paso 2:** Implementar Loyalty (HomeScreen + LoyaltyScreen)
3. **Paso 3:** Implementar Orders (OrderHistoryScreen + OrdersPage)
4. **Paso 4:** Implementar Barber Schedule (BookScreen + BarberScheduleScreen)
5. **Paso 5:** Implementar Services (BookScreen + ShopServicesScreen + ServicesPage)
6. **Paso 6:** Testing en los 3 dispositivos (U11, M9, Chrome web-admin)
7. **Paso 7:** Deploy a producción

---

## 📌 IMPORTANTE

- Todos los `onSnapshot()` **DEBEN tener cleanup** con `useEffect return`
- Esto previene memory leaks cuando el componente se desmonta
- Cada listener debe estar en su propio `useEffect` con dependencias claras
- Importar `onSnapshot` desde `'firebase/firestore'`

