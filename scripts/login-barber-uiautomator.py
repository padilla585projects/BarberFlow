#!/usr/bin/env python3
"""
Login automatizado para M9 (HT54BYJ01402) via UIAutomator2
Requiere: pip install uiautomator2
Uso: python3 login-barber-uiautomator.py
"""

import sys
import time

try:
    import uiautomator2 as u2
except ImportError:
    print("❌ UIAutomator2 no instalado. Instala con: pip install uiautomator2")
    sys.exit(1)

DEVICE_SERIAL = 'HT54BYJ01402'
BARBER_EMAIL = 'barbero@test.com'
BARBER_PASSWORD = 'test1234'
PACKAGE_NAME = 'com.barberflow.app'

def login_barber():
    print(f"[*] Conectando a {DEVICE_SERIAL}...")
    try:
        d = u2.connect(DEVICE_SERIAL)
    except Exception as e:
        print(f"[!] No se pudo conectar: {e}")
        sys.exit(1)

    print(f"[+] Conectado a {DEVICE_SERIAL}")
    print(f"[*] Informacion del dispositivo: {d.device_info}\n")

    # Iniciar la app
    print("[*] Iniciando BarberFlow...")
    d.app_start(PACKAGE_NAME)
    time.sleep(3)

    # Tomar screenshot para ver qué está en pantalla
    print("[*] Estado actual de la pantalla...")
    try:
        d.screenshot('login_screen.png')
        print("   Screenshot guardado en: login_screen.png")
    except:
        pass

    # Buscar campos de login usando diferentes estrategias
    print("\n[*] Buscando campos de login...\n")

    # Estrategia 1: Buscar por ID de recurso (si están disponibles)
    email_field = None
    password_field = None
    login_button = None

    # Intentar encontrar campos por texto placeholder o ID
    try:
        # Buscar todos los EditText (campos de entrada)
        fields = d.xpath('//android.widget.EditText').all()
        print(f"  [+] Encontrados {len(fields)} campos de entrada")

        if len(fields) >= 1:
            email_field = fields[0]
            print(f"    [*] Campo 1 (email): {email_field}")

        if len(fields) >= 2:
            password_field = fields[1]
            print(f"    [*] Campo 2 (password): {password_field}")

    except Exception as e:
        print(f"  [!] No se encontraron campos via XPath: {e}")

    # Si no encontramos via XPath, intentar por coordinates (fallback)
    if not email_field:
        print("\n  Usando fallback (coordinates)...")
        email_field = d(class_name='android.widget.EditText')

    # Escribir en email
    if email_field:
        print(f"\n[*] Escribiendo email: {BARBER_EMAIL}")
        try:
            email_field.click()
            time.sleep(0.3)
            # Triple tap para seleccionar todo, luego escribir
            d.double_click(540, 1063)  # Doble tap en el campo de email
            time.sleep(0.2)
            d.press('del')  # Presionar Delete
            time.sleep(0.2)
            email_field.input(BARBER_EMAIL)  # Usar input() que es lo correcto
            print("   [+] Email escrito")
        except Exception as e:
            print(f"   [!] Error escribiendo email: {e}")

    time.sleep(0.5)

    # Escribir en password
    if password_field:
        print(f"[*] Escribiendo contraseña...")
        try:
            password_field.click()
            time.sleep(0.3)
            d.double_click(540, 1244)  # Doble tap en el campo de password
            time.sleep(0.2)
            d.press('del')  # Presionar Delete
            time.sleep(0.2)
            password_field.input(BARBER_PASSWORD)  # Usar input()
            print("   [+] Contraseña escrita")
        except Exception as e:
            print(f"   [!] Error escribiendo password: {e}")

    time.sleep(1)

    # Buscar botón de login
    print("\n[*] Buscando boton de login...")
    try:
        # Intentar encontrar por texto
        login_button = d(text_contains='Login').first
        if login_button:
            print("  [*] Boton encontrado por texto 'Login'")
            login_button.click()
    except:
        pass

    if not login_button:
        try:
            # Intentar encontrar por contenido-desc
            login_button = d(content_desc_contains='login').first
            if login_button:
                print("  [*] Boton encontrado por content-desc")
                login_button.click()
        except:
            pass

    if not login_button:
        print("  [!] Boton no encontrado, haciendo tap en coordenada estandar...")
        d.click(540, 580)

    print("\n[*] Esperando autenticacion (15 segundos)...")
    time.sleep(15)

    print("\n[+] Login completado. Verificar M9 para confirmar sesion del barbero.")

if __name__ == '__main__':
    login_barber()
