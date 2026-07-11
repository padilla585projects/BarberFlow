#!/usr/bin/env python3
"""
Create test users for E2E Testing on BarberFlow
Uses Firebase REST API
"""

import requests
import json

FIREBASE_API_KEY = "AIzaSyDvxYM-BYx9K4vX5R8-Q2j3nL7pMkOqW8E"
FIREBASE_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signUp"

TEST_USERS = [
    {"email": "cliente@test.com", "password": "Test123456", "displayName": "Cliente Test"},
    {"email": "barbero@test.com", "password": "Test123456", "displayName": "Barbero Test"},
    {"email": "propietario@test.com", "password": "Test123456", "displayName": "Propietario Test"}
]

def create_user(email, password, display_name):
    print(f"[*] Creating: {email}")
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
            print(f"    [+] Created successfully")
            return True
        else:
            error = data.get("error", {}).get("message", "Unknown error")
            if "EMAIL_EXISTS" in error:
                print(f"    [!] Email already exists")
            else:
                print(f"    [-] Error: {error}")
            return False
    except Exception as e:
        print(f"    [-] Exception: {str(e)}")
        return False

def main():
    print("[*] Setting up test users for E2E Testing...\n")

    for user in TEST_USERS:
        create_user(user["email"], user["password"], user["displayName"])

    print("\n[+] Setup complete\n")
    print("[*] Available credentials:")
    for user in TEST_USERS:
        print(f"   {user['email']} / {user['password']}")

    print("\n[*] Test URL (Chrome):")
    print("   https://barberflow-2026.web.app")
    print("\n[*] Test flows:")
    print("   1. Client: Search barbershop -> Book appointment -> Pay")
    print("   2. Barber: View appointments -> Update status")
    print("   3. Owner: Dashboard -> Revenue -> Inventory")

if __name__ == "__main__":
    main()
