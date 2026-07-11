#!/usr/bin/env python3
"""
Crear usuarios de prueba para E2E Testing en BarberFlow
Usa Firebase REST API
"""

import requests
import json

FIREBASE_API_KEY = "AIzaSyDvxYM-BYx9K4vX5R8-Q2j3nL7pMkOqW8E"
FIREBASE_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signUp"

TEST_USERS = [
    {
        "email": "cliente@test.com",
        "password": "Test123456",
        "displayName": "Cliente Test",
        "role": "client"
    },
    {
        "email": "barbero@test.com",
        "password": "Test123456",
        "displayName": "Barbero Test",
        "role": "barber"
    },
    {
        "email": "propietario@test.com",
        "password": "Test123456",
        "displayName": "Propietario Test",
        "role": "owner"
    }
]

def create_user(email, password, display_name):
    """Crear usuario en Firebase Auth"""
    print(f"[*] Creando: {email} ({display_name})")

    payload = {
        "email": email,
        "password": password,
        "displayName": display_name,
        "returnSecureToken": True
    }

    params = {"key": FIREBASE_API_KEY}

    try:
        response = requests.post(FIREBASE_URL, json=payload, params=params, timeout=10)
        data = response.json()

        if "idToken" in data:
            print(f"    ✅ Usuario creado exitosamente")
            print(f"    📧 Email: {email}")
            print(f"    🔑 Password: {password}")
            print(f"    👤 Rol: {display_name}\n")
            return True
        else:
            error = data.get("error", {}).get("message", "Error desconocido")
            if "EMAIL_EXISTS" in error:
                print(f"    ⚠️  Email ya existe - ignorando\n")
            else:
                print(f"    ❌ Error: {error}\n")
            return False
    except Exception as e:
        print(f"    ❌ Excepción: {str(e)}\n")
        return False

def main():
    print("🔐 Creando usuarios de prueba en Firebase...\n")

    created = 0
    for user in TEST_USERS:
        if create_user(user["email"], user["password"], user["displayName"]):
            created += 1

    print("✅ Setup completado\n")
    print("📝 Credenciales disponibles:")
    for user in TEST_USERS:
        print(f"   {user['email']} / {user['password']}")

    print("\n🌐 Testing en Chrome:")
    print("   https://barberflow-2026.web.app")
    print("\n📋 Flujos a probar:")
    print("   1. Cliente: Buscar barbería → Reservar cita → Pagar")
    print("   2. Barbero: Ver citas → Actualizar estado")
    print("   3. Propietario: Dashboard → Ganancias → Inventario")

if __name__ == "__main__":
    main()
