#!/usr/bin/env python3
"""
Login simple para M9 usando UIAutomator2
Enfoque: taps en coordenadas + input text directo
"""

import sys
import time

try:
    import uiautomator2 as u2
except ImportError:
    print("[!] UIAutomator2 no instalado. Instala con: pip install uiautomator2")
    sys.exit(1)

DEVICE_SERIAL = 'HT54BYJ01402'
BARBER_EMAIL = 'barbero@test.com'
BARBER_PASSWORD = 'test1234'
PACKAGE_NAME = 'com.barberflow.app'

def main():
    print(f"[*] Conectando a {DEVICE_SERIAL}...")
    d = u2.connect(DEVICE_SERIAL)
    print(f"[+] Conectado")

    print("[*] Iniciando app...")
    d.app_start(PACKAGE_NAME)
    time.sleep(4)

    # Coordenadas para campos de login (ajustar si es necesario)
    email_x, email_y = 270, 333
    password_x, password_y = 270, 422
    login_btn_x, login_btn_y = 270, 482

    print(f"[*] Limpiando campos...")
    # Tap en email field + clear
    d.click(email_x, email_y)
    time.sleep(0.3)
    d.press('delete')  # o 'del'
    time.sleep(0.2)

    print(f"[*] Escribiendo email: {BARBER_EMAIL}")
    d.send_keys(BARBER_EMAIL)
    time.sleep(0.5)

    print(f"[*] Tap en password field")
    d.click(password_x, password_y)
    time.sleep(0.3)
    d.press('delete')
    time.sleep(0.2)

    print(f"[*] Escribiendo password")
    d.send_keys(BARBER_PASSWORD)
    time.sleep(0.5)

    print(f"[*] Tap en boton LOGIN")
    d.click(login_btn_x, login_btn_y)

    print(f"[*] Esperando autenticacion (15s)...")
    time.sleep(15)

    # Screenshot del resultado
    d.screenshot('barber_login_final.png')
    print(f"[+] Screenshot guardado: barber_login_final.png")
    print(f"[+] Login completado!")

if __name__ == '__main__':
    main()
