# BarberFlow - Technical Recommendations

## Quick Fix Guide for Each Issue

---

## ISSUE-001: Firebase 400 Error

### Diagnosis
Firebase authentication returns HTTP 400 after login.

### Possible Causes
1. **Expired or invalid Firebase API key**
2. **CORS configuration issue**
3. **Firebase project not properly set up**
4. **Missing required fields in auth request**
5. **Incorrect email/password format**

### Fix Steps

#### Step 1: Verify Firebase Configuration
```typescript
// File: src/config/firebase.ts or src/services/auth.ts

// Check that API key matches Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCkJOmEDgREdMNcXZqwRTBmPPPDCsVwkpM",
  authDomain: "barberflow-2026.firebaseapp.com",
  projectId: "barberflow-2026",
  storageBucket: "barberflow-2026.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

#### Step 2: Check Network Request
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "identitytoolkit"
4. Click login and capture the request
5. Check:
   - Status: Should be 200, not 400
   - Request body: Verify email/password are being sent
   - Response: Check error message from Firebase

#### Step 3: Verify Test Account
```bash
# Test if account exists in Firebase
# Go to: Firebase Console → Authentication → Users
# Look for: cliente@test.com

# If account doesn't exist, create it manually or via admin SDK
```

#### Step 4: Check Firestore Rules
```javascript
// File: firebasestore.rules
// Make sure auth tests pass
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### Code Fix Example
```typescript
// src/services/auth.ts

export async function loginWithEmail(email: string, password: string) {
  try {
    // Add validation
    if (!email || !password) {
      throw new Error("Email and password required");
    }

    // Trim whitespace
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Call Firebase
    const userCredential = await firebase.auth().signInWithEmailAndPassword(
      cleanEmail,
      cleanPassword
    );

    return userCredential.user;
  } catch (error: any) {
    console.error("Login error:", error.code, error.message);
    
    // Handle specific errors
    if (error.code === "auth/user-not-found") {
      throw new Error("User does not exist");
    }
    if (error.code === "auth/wrong-password") {
      throw new Error("Invalid password");
    }
    
    throw error;
  }
}
```

### Verification
After fix, user should:
- See no 400 errors in Network tab
- Be redirected to dashboard
- See no console errors

---

## ISSUE-002: No Logout Option

### Quick Fix
Add logout button to navigation/profile menu.

### Implementation

#### Option A: Add to Navigation
```typescript
// File: src/components/Navigation.tsx

export function Navigation() {
  const handleLogout = async () => {
    try {
      await firebase.auth().signOut();
      navigate('/auth/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav>
      {/* existing nav items */}
      <button onClick={handleLogout}>
        Logout
      </button>
    </nav>
  );
}
```

#### Option B: Add to Profile Menu
```typescript
// File: src/pages/Profile.tsx

export function Profile() {
  return (
    <div>
      <h1>My Profile</h1>
      {/* profile content */}
      
      <button onClick={handleLogout} className="logout-btn">
        Sign Out
      </button>
    </div>
  );
}
```

#### Option C: Add to Settings
```typescript
// File: src/pages/Settings.tsx

export function Settings() {
  return (
    <div>
      <h2>Settings</h2>
      
      <section className="danger-zone">
        <h3>Danger Zone</h3>
        <button onClick={handleLogout} className="btn-danger">
          Logout
        </button>
      </section>
    </div>
  );
}
```

### CSS
```css
.logout-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.logout-btn:hover {
  background-color: #da190b;
}
```

### Testing
- Click logout button
- Should redirect to login page
- Browser storage should be cleared
- Should not be able to access dashboard without re-login

---

## ISSUE-003: No Appointment Section (Barbero)

### Implementation Plan

#### Step 1: Create Appointments Service
```typescript
// File: src/services/appointmentService.ts

import { firestore, firebase } from './firebase';

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  date: Date;
  time: string;
  duration: number;
  status: 'booked' | 'completed' | 'cancelled';
  notes?: string;
}

export async function getBarberoAppointments(barberoId: string): Promise<Appointment[]> {
  try {
    const snapshot = await firestore
      .collection('appointments')
      .where('barberoId', '==', barberoId)
      .where('date', '>=', new Date())
      .orderBy('date', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Appointment));
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return [];
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: Appointment['status']
): Promise<void> {
  return firestore
    .collection('appointments')
    .doc(appointmentId)
    .update({ status });
}
```

#### Step 2: Create Appointment List Component
```typescript
// File: src/components/AppointmentList.tsx

import React, { useEffect, useState } from 'react';
import { Appointment, getBarberoAppointments } from '../services/appointmentService';
import { useAuthContext } from '../contexts/AuthContext';

export function AppointmentList() {
  const { user } = useAuthContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      loadAppointments();
    }
  }, [user]);

  async function loadAppointments() {
    try {
      setLoading(true);
      const appts = await getBarberoAppointments(user!.uid);
      setAppointments(appts);
    } catch (error) {
      console.error("Failed to load appointments:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading appointments...</div>;
  }

  if (appointments.length === 0) {
    return <div>No upcoming appointments</div>;
  }

  return (
    <div className="appointment-list">
      <h2>Mis Citas</h2>
      {appointments.map(appt => (
        <div key={appt.id} className="appointment-card">
          <div className="appointment-header">
            <h3>{appt.serviceName}</h3>
            <span className="appointment-time">{appt.time}</span>
          </div>
          <div className="appointment-details">
            <p><strong>Cliente:</strong> {appt.clientName}</p>
            <p><strong>Fecha:</strong> {new Date(appt.date).toLocaleDateString()}</p>
            <p><strong>Duración:</strong> {appt.duration} minutos</p>
            <p><strong>Estado:</strong> {appt.status}</p>
          </div>
          <div className="appointment-actions">
            <button onClick={() => handleComplete(appt.id)}>
              Completado
            </button>
            <button onClick={() => handleCancel(appt.id)}>
              Cancelar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

async function handleComplete(appointmentId: string) {
  // Update status to 'completed'
}

async function handleCancel(appointmentId: string) {
  // Update status to 'cancelled'
}
```

#### Step 3: Add to Barber Dashboard
```typescript
// File: src/pages/BarberDashboard.tsx

import { AppointmentList } from '../components/AppointmentList';

export function BarberDashboard() {
  return (
    <div className="barber-dashboard">
      <h1>Barbero Dashboard</h1>
      
      <div className="dashboard-content">
        {/* Existing sections */}
        
        {/* Add appointments section */}
        <section className="appointments-section">
          <AppointmentList />
        </section>
      </div>
    </div>
  );
}
```

#### Step 4: Add CSS
```css
.appointment-list {
  margin-top: 20px;
}

.appointment-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: #fff;
}

.appointment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.appointment-details {
  margin-bottom: 12px;
  color: #666;
  font-size: 14px;
}

.appointment-actions {
  display: flex;
  gap: 8px;
}

.appointment-actions button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
```

---

## ISSUE-004 & ISSUE-006: Console Errors

### Debugging Steps

1. **Open Developer Console**
   - Press F12 in browser
   - Click "Console" tab

2. **Reproduce the error**
   - Login as the user type
   - Note the exact error message

3. **Check common causes**
   ```javascript
   // Missing element
   document.getElementById('missing-element')  // ❌ Returns null

   // Undefined function
   someFunction()  // ❌ ReferenceError

   // Network error
   fetch('/api/data')  // ❌ 404 or 500 error

   // Permission error
   // Access denied to Firestore collection
   ```

4. **Fix based on error type**
   ```typescript
   // Example: Safe element access
   const element = document.getElementById('myElement');
   if (element) {  // ✅ Check before using
     element.addEventListener('click', handler);
   }

   // Example: Firestore permission error
   // Add/check permissions in firestore.rules
   ```

### Firestore Permissions Fix
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Barbero can read/write their own data
    match /barberos/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Barbero can read appointments assigned to them
    match /appointments/{document=**} {
      allow read, write: if request.auth.uid == resource.data.barberoId;
    }
    
    // Owner can read/write their business
    match /barbershops/{shopId} {
      allow read, write: if request.auth.uid == resource.data.ownerId;
    }
  }
}
```

---

## ISSUE-005: Schedule Management

### Create Schedule Component
```typescript
// File: src/pages/BarberSchedule.tsx

export function BarberSchedule() {
  const [schedule, setSchedule] = useState({
    monday: { start: '09:00', end: '18:00' },
    tuesday: { start: '09:00', end: '18:00' },
    wednesday: { start: '09:00', end: '18:00' },
    thursday: { start: '09:00', end: '18:00' },
    friday: { start: '09:00', end: '18:00' },
    saturday: { start: '10:00', end: '16:00' },
    sunday: { start: null, end: null }, // Closed
  });

  const handleSave = async () => {
    // Save to Firestore
    await firestore.collection('barberos').doc(userId).update({
      schedule
    });
  };

  return (
    <div className="schedule-page">
      <h2>Mi Horario</h2>
      <form onSubmit={handleSave}>
        {Object.entries(schedule).map(([day, times]) => (
          <div key={day} className="schedule-row">
            <label>{day}</label>
            <input
              type="time"
              value={times.start}
              onChange={(e) => updateDay(day, 'start', e.target.value)}
            />
            <span>-</span>
            <input
              type="time"
              value={times.end}
              onChange={(e) => updateDay(day, 'end', e.target.value)}
            />
            <button type="button" onClick={() => closeDay(day)}>
              Cerrado
            </button>
          </div>
        ))}
        <button type="submit">Guardar Horario</button>
      </form>
    </div>
  );
}
```

---

## ISSUE-007: Owner Admin Dashboard

### File Structure to Create
```
src/pages/
├── OwnerDashboard.tsx           # Main dashboard
├── BarbershopSettings.tsx        # Business info
├── EmployeeManagement.tsx        # Employee roster
├── ServiceManagement.tsx         # Services offered
└── Analytics.tsx                 # Business reports

src/components/
├── EmployeeForm.tsx
├── ServiceForm.tsx
├── AnalyticsChart.tsx
└── BusinessStatistics.tsx
```

### Skeleton Implementation
```typescript
// File: src/pages/OwnerDashboard.tsx

export function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'barbershop' | 'employees' | 'services' | 'analytics'>('overview');

  return (
    <div className="owner-dashboard">
      <h1>Admin Panel</h1>
      
      <nav className="admin-tabs">
        <button onClick={() => setActiveTab('overview')}>Dashboard</button>
        <button onClick={() => setActiveTab('barbershop')}>Barbershop</button>
        <button onClick={() => setActiveTab('employees')}>Employees</button>
        <button onClick={() => setActiveTab('services')}>Services</button>
        <button onClick={() => setActiveTab('analytics')}>Analytics</button>
      </nav>

      <div className="admin-content">
        {activeTab === 'overview' && <BusinessStatistics />}
        {activeTab === 'barbershop' && <BarbershopSettings />}
        {activeTab === 'employees' && <EmployeeManagement />}
        {activeTab === 'services' && <ServiceManagement />}
        {activeTab === 'analytics' && <Analytics />}
      </div>
    </div>
  );
}
```

---

## Testing Checklist

After implementing each fix:

- [ ] Console shows no errors
- [ ] Feature works as expected
- [ ] Tested on desktop (1280x720)
- [ ] Tested on mobile (375x812)
- [ ] Firestore permissions allow operations
- [ ] No network errors in DevTools
- [ ] User can complete workflow end-to-end

---

## Files to Review First

1. **Authentication**: `src/services/auth.ts` or `src/config/firebase.ts`
2. **Barber Dashboard**: `src/pages/BarberDashboard.tsx`
3. **Owner Dashboard**: `src/pages/OwnerDashboard.tsx`
4. **Firestore Rules**: `firestore.rules`

---

## Deployment Checklist

Before deploying, verify:
- [ ] All console errors fixed
- [ ] All missing features implemented
- [ ] QA audit run and passed
- [ ] Security review done
- [ ] Firestore rules updated
- [ ] Environment variables set
- [ ] Firebase project limits checked
