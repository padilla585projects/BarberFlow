#!/usr/bin/env python3
"""
E2E Testing Debug - Inspect page elements
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "https://barberflow-2026.web.app"

print("[*] Iniciando Chrome...")
driver = webdriver.Chrome()

try:
    print("[*] Abriendo login page...")
    driver.get(f"{BASE_URL}/auth/login")
    time.sleep(3)

    print("[*] Clickeando email tab...")
    email_tab = driver.find_element(By.XPATH, "//button[contains(text(), 'Email')]")
    email_tab.click()
    time.sleep(2)

    print("[*] Llenando credenciales...")
    email_field = driver.find_element(By.CSS_SELECTOR, "input[type='email']")
    password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")

    email_field.click()
    time.sleep(0.3)
    email_field.clear()
    time.sleep(0.2)
    email_field.send_keys("cliente@test.com")
    print("  [+] Email ingresado")
    time.sleep(0.5)

    password_field.click()
    time.sleep(0.3)
    password_field.clear()
    time.sleep(0.2)
    password_field.send_keys("test1234")
    print("  [+] Password ingresado")
    time.sleep(2)

    print("\n[*] ESPERANDO 3 segundos para que el botón aparezca...")
    time.sleep(3)

    print("\n[*] Todos los botones en la página AHORA:")
    buttons = driver.find_elements(By.TAG_NAME, "button")
    print(f"Total botones encontrados: {len(buttons)}")
    for i, btn in enumerate(buttons):
        try:
            text = btn.text
            visible = btn.is_displayed()
            enabled = btn.is_enabled()
            print(f"  [{i}] Text: '{text}' | Visible: {visible} | Enabled: {enabled}")
        except Exception as e:
            print(f"  [{i}] Error al inspeccionar: {e}")

    print("\n[*] Buscando botón de login con varios patrones...")

    # Pattern 1
    try:
        login_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'INICIAR')]")
        print(f"[+] Encontrado con XPath contains(text(), 'INICIAR')")
        print(f"    Visible: {login_btn.is_displayed()}")
    except Exception as e:
        print(f"[-] No encontrado con contains(text(), 'INICIAR'): {e}")

    # Pattern 2
    try:
        login_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'SESION')]")
        print(f"[+] Encontrado con XPath contains(text(), 'SESION')")
    except Exception as e:
        print(f"[-] No encontrado")

    # Pattern 3 - Any button containing S in uppercase
    try:
        login_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'S')]")
        print(f"[+] Encontrado botón con 'S': '{login_btn.text}'")
    except Exception as e:
        print(f"[-] No encontrado")

    # Check for input elements
    print("\n[*] Inputs en la página:")
    inputs = driver.find_elements(By.TAG_NAME, "input")
    for i, inp in enumerate(inputs):
        try:
            input_type = inp.get_attribute("type")
            value = inp.get_attribute("value")
            placeholder = inp.get_attribute("placeholder")
            print(f"  [{i}] Type: {input_type} | Value: '{value}' | Placeholder: '{placeholder}'")
        except:
            pass

finally:
    print("\n[*] Cerrando navegador...")
    driver.quit()
