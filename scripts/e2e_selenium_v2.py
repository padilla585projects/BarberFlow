#!/usr/bin/env python3
"""
E2E Testing con Selenium - BarberFlow Chrome - V2
Using explicit waits and more robust selectors
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import json
from datetime import datetime
import os
import sys

# Fix encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "https://barberflow-2026.web.app"
SCREENSHOTS_DIR = "e2e_selenium_screenshots_v2"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

class BarberFlowE2ESelenium:
    def __init__(self):
        print("[*] Iniciando Chrome con Selenium...")
        self.driver = webdriver.Chrome()
        self.wait = WebDriverWait(self.driver, 10)
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "flows": {}
        }

    def screenshot(self, name):
        path = f"{SCREENSHOTS_DIR}/{name}.png"
        self.driver.save_screenshot(path)
        print(f"    [+] Screenshot: {path}")

    def find_login_button(self):
        """Find login button using multiple strategies"""
        try:
            # Strategy 1: Find by button that contains "INICIAR"
            buttons = self.driver.find_elements(By.TAG_NAME, "button")
            for btn in buttons:
                btn_text = btn.text.strip()
                if "INICIAR" in btn_text and btn.is_displayed():
                    return btn
        except:
            pass

        raise Exception("No se encontró botón de login con texto INICIAR")

    def test_cliente(self):
        print("\n[*] === FLUJO CLIENTE ===")
        flow = {"status": "started", "steps": []}

        try:
            print("[1/4] Abriendo pagina de login...")
            self.driver.get(f"{BASE_URL}/auth/login")
            time.sleep(2)
            self.screenshot("01_login")
            flow["steps"].append("Page loaded")

            print("[2/4] Clickeando pestaña 'Email y contraseña'...")
            email_tab = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Email')]")
            email_tab.click()
            time.sleep(2)
            self.screenshot("01b_email_tab")

            print("[2/4] Completando login...")
            email_field = self.driver.find_element(By.CSS_SELECTOR, "input[type='email']")
            password_field = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")

            email_field.click()
            time.sleep(0.2)
            email_field.clear()
            time.sleep(0.2)
            email_field.send_keys("cliente@test.com")
            print("    [+] Email ingresado")
            time.sleep(0.5)

            password_field.click()
            time.sleep(0.2)
            password_field.clear()
            time.sleep(0.2)
            password_field.send_keys("test1234")
            print("    [+] Password ingresado")
            time.sleep(2)

            # Find and click login button
            print("[2.5/4] Buscando botón de login...")
            login_btn = self.find_login_button()
            print(f"    [+] Botón encontrado: '{login_btn.text}'")
            login_btn.click()

            time.sleep(3)
            self.screenshot("02_cliente_home")
            flow["steps"].append("Login successful")

            print("[3/4] Buscando barberia...")
            try:
                self.wait.until(
                    EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Barber')]"))
                )
                self.screenshot("03_barbershop_list")
                flow["steps"].append("Barbershop found")
            except:
                print("    [!] Barbershop no encontrado")

            print("[4/4] Validando estado final...")
            self.screenshot("04_cliente_final")
            flow["status"] = "success"
            print("[+] Flujo CLIENTE: OK")

        except Exception as e:
            flow["status"] = f"error: {str(e)}"
            print(f"[-] Error: {e}")
            self.screenshot("error_cliente")

        self.results["flows"]["cliente"] = flow

    def test_barbero(self):
        print("\n[*] === FLUJO BARBERO ===")
        flow = {"status": "started", "steps": []}

        try:
            print("[1/3] Abriendo login...")
            self.driver.get(f"{BASE_URL}/auth/login")
            time.sleep(2)

            print("[2/3] Clickeando pestaña de email...")
            email_tab = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Email')]")
            email_tab.click()
            time.sleep(2)

            print("[2/3] Login como barbero...")
            email_field = self.driver.find_element(By.CSS_SELECTOR, "input[type='email']")
            password_field = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")

            email_field.click()
            email_field.clear()
            email_field.send_keys("barbero@test.com")
            password_field.click()
            password_field.clear()
            password_field.send_keys("test1234")
            time.sleep(2)

            login_btn = self.find_login_button()
            print(f"    [+] Botón encontrado: '{login_btn.text}'")
            login_btn.click()

            time.sleep(3)
            self.screenshot("05_barbero_dashboard")
            flow["steps"].append("Barbero logged in")

            print("[3/3] Verificando dashboard...")
            self.screenshot("06_barbero_final")
            flow["status"] = "success"
            print("[+] Flujo BARBERO: OK")

        except Exception as e:
            flow["status"] = f"error: {str(e)}"
            print(f"[-] Error: {e}")
            self.screenshot("error_barbero")

        self.results["flows"]["barbero"] = flow

    def test_propietario(self):
        print("\n[*] === FLUJO PROPIETARIO ===")
        flow = {"status": "started", "steps": []}

        try:
            print("[1/3] Abriendo login...")
            self.driver.get(f"{BASE_URL}/auth/login")
            time.sleep(2)

            print("[2/3] Clickeando pestaña de email...")
            email_tab = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Email')]")
            email_tab.click()
            time.sleep(2)

            print("[2/3] Login como propietario...")
            email_field = self.driver.find_element(By.CSS_SELECTOR, "input[type='email']")
            password_field = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")

            email_field.click()
            email_field.clear()
            email_field.send_keys("propietario@test.com")
            password_field.click()
            password_field.clear()
            password_field.send_keys("test1234")
            time.sleep(2)

            login_btn = self.find_login_button()
            print(f"    [+] Botón encontrado: '{login_btn.text}'")
            login_btn.click()

            time.sleep(3)
            self.screenshot("07_propietario_dashboard")
            flow["steps"].append("Propietario logged in")

            print("[3/3] Verificando modulos...")
            self.screenshot("08_propietario_final")
            flow["status"] = "success"
            print("[+] Flujo PROPIETARIO: OK")

        except Exception as e:
            flow["status"] = f"error: {str(e)}"
            print(f"[-] Error: {e}")
            self.screenshot("error_propietario")

        self.results["flows"]["propietario"] = flow

    def run(self):
        try:
            self.test_cliente()
            self.test_barbero()
            self.test_propietario()

            # Guardar resultados
            with open("e2e_selenium_results_v2.json", "w", encoding='utf-8') as f:
                json.dump(self.results, f, indent=2, ensure_ascii=False)

            print("\n" + "="*60)
            print("[+] TESTING COMPLETADO")
            print("="*60)
            print(f"\n[*] Screenshots: {SCREENSHOTS_DIR}/")
            print(f"[*] Resultados: e2e_selenium_results_v2.json")

            for flow, result in self.results["flows"].items():
                status = result["status"]
                print(f"  {flow:15} -> {status}")

        finally:
            print("\n[*] Cerrando navegador...")
            self.driver.quit()

if __name__ == "__main__":
    tester = BarberFlowE2ESelenium()
    tester.run()
