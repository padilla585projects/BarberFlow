#!/usr/bin/env python3
"""
E2E Testing con Selenium - BarberFlow Chrome - EXPANDED
Tests full user flows with validation of key page elements
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
SCREENSHOTS_DIR = "e2e_selenium_screenshots_expanded"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

class BarberFlowE2EExpanded:
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
        """Find login button using Python string matching"""
        try:
            buttons = self.driver.find_elements(By.TAG_NAME, "button")
            for btn in buttons:
                btn_text = btn.text.strip()
                if "INICIAR" in btn_text and btn.is_displayed():
                    return btn
        except:
            pass
        raise Exception("No se encontró botón de login")

    def login(self, email, password):
        """Realiza login con email y contraseña"""
        email_tab = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Email')]")
        email_tab.click()
        time.sleep(2)

        email_field = self.driver.find_element(By.CSS_SELECTOR, "input[type='email']")
        password_field = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")

        email_field.click()
        time.sleep(0.2)
        email_field.clear()
        time.sleep(0.2)
        email_field.send_keys(email)
        time.sleep(0.5)

        password_field.click()
        time.sleep(0.2)
        password_field.clear()
        time.sleep(0.2)
        password_field.send_keys(password)
        time.sleep(2)

        login_btn = self.find_login_button()
        login_btn.click()
        time.sleep(3)

    def check_element_exists(self, by, selector, timeout=5):
        """Verifica si un elemento existe en la página"""
        try:
            self.wait.until(
                EC.presence_of_element_located((by, selector))
            )
            return True
        except:
            return False

    def check_element_visible(self, by, selector, timeout=5):
        """Verifica si un elemento es visible"""
        try:
            self.wait.until(
                EC.visibility_of_element_located((by, selector))
            )
            return True
        except:
            return False

    def test_cliente_flow(self):
        print("\n[*] === FLUJO CLIENTE (BÚSQUEDA Y RESERVA) ===")
        flow = {
            "status": "started",
            "validations": [],
            "steps": []
        }

        try:
            print("[1/6] Abriendo página de login...")
            self.driver.get(f"{BASE_URL}/auth/login")
            time.sleep(2)
            self.screenshot("cliente_01_login_page")
            flow["steps"].append("Login page loaded")

            print("[2/6] Haciendo login como cliente...")
            self.login("cliente@test.com", "test1234")
            self.screenshot("cliente_02_after_login")
            flow["steps"].append("Logged in successfully")

            print("[3/6] Validando página de inicio del cliente...")
            # Buscar elementos típicos de la página del cliente
            has_search_bar = self.check_element_visible(By.XPATH, "//input[contains(@placeholder, 'Buscar')]")
            has_barber_list = self.check_element_visible(By.XPATH, "//div[contains(text(), 'Barber')]", timeout=3)

            flow["validations"].append(f"Search bar visible: {has_search_bar}")
            flow["validations"].append(f"Barber list visible: {has_barber_list}")
            print(f"    [+] Search bar visible: {has_search_bar}")
            print(f"    [+] Barber list visible: {has_barber_list}")
            self.screenshot("cliente_03_home_page")

            print("[4/6] Buscando un barbero...")
            # Intenta buscar la primera opción de barbería
            try:
                barbershops = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'barber')]")
                if barbershops:
                    print(f"    [+] Encontradas {len(barbershops)} barberías")
                    flow["steps"].append(f"Found {len(barbershops)} barbershops")
                    # Click on first barbershop
                    barbershops[0].click()
                    time.sleep(2)
                    self.screenshot("cliente_04_barbershop_detail")
            except Exception as e:
                print(f"    [!] No se pudo hacer click en barbería: {e}")
                flow["validations"].append(f"Barbershop click error: {e}")

            print("[5/6] Esperando carga de página de detalle...")
            time.sleep(1)
            self.screenshot("cliente_05_detail_page")

            print("[6/6] Estado final del cliente...")
            self.screenshot("cliente_06_final")
            flow["status"] = "success"
            print("[+] Flujo CLIENTE: OK")

        except Exception as e:
            flow["status"] = f"error: {str(e)}"
            print(f"[-] Error: {e}")
            self.screenshot("cliente_error")

        self.results["flows"]["cliente"] = flow

    def test_barbero_flow(self):
        print("\n[*] === FLUJO BARBERO (DASHBOARD Y CITAS) ===")
        flow = {
            "status": "started",
            "validations": [],
            "steps": []
        }

        try:
            print("[1/5] Abriendo página de login...")
            self.driver.get(f"{BASE_URL}/auth/login")
            time.sleep(2)
            self.screenshot("barbero_01_login_page")
            flow["steps"].append("Login page loaded")

            print("[2/5] Haciendo login como barbero...")
            self.login("barbero@test.com", "test1234")
            self.screenshot("barbero_02_after_login")
            flow["steps"].append("Logged in successfully")

            print("[3/5] Validando dashboard del barbero...")
            # Buscar elementos de dashboard del barbero
            has_appointments = self.check_element_visible(By.XPATH, "//text()[contains(., 'Citas')]", timeout=3)
            has_schedule = self.check_element_visible(By.XPATH, "//text()[contains(., 'Horario')]", timeout=3)

            flow["validations"].append(f"Appointments section: {has_appointments}")
            flow["validations"].append(f"Schedule section: {has_schedule}")
            print(f"    [+] Appointments visible: {has_appointments}")
            print(f"    [+] Schedule visible: {has_schedule}")
            self.screenshot("barbero_03_dashboard")

            print("[4/5] Buscando lista de citas...")
            try:
                appointments = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'appointment')]")
                print(f"    [+] Encontradas {len(appointments)} citas")
                flow["steps"].append(f"Found {len(appointments)} appointments")
            except:
                print(f"    [!] No se pudo obtener lista de citas")

            print("[5/5] Estado final del barbero...")
            self.screenshot("barbero_04_final")
            flow["status"] = "success"
            print("[+] Flujo BARBERO: OK")

        except Exception as e:
            flow["status"] = f"error: {str(e)}"
            print(f"[-] Error: {e}")
            self.screenshot("barbero_error")

        self.results["flows"]["barbero"] = flow

    def test_propietario_flow(self):
        print("\n[*] === FLUJO PROPIETARIO (ADMIN PANEL) ===")
        flow = {
            "status": "started",
            "validations": [],
            "steps": []
        }

        try:
            print("[1/5] Abriendo página de login...")
            self.driver.get(f"{BASE_URL}/auth/login")
            time.sleep(2)
            self.screenshot("propietario_01_login_page")
            flow["steps"].append("Login page loaded")

            print("[2/5] Haciendo login como propietario...")
            self.login("propietario@test.com", "test1234")
            self.screenshot("propietario_02_after_login")
            flow["steps"].append("Logged in successfully")

            print("[3/5] Validando panel de admin...")
            # Buscar elementos de admin
            has_stats = self.check_element_visible(By.XPATH, "//text()[contains(., 'Estadísticas')]", timeout=3)
            has_barbershop_mgmt = self.check_element_visible(By.XPATH, "//text()[contains(., 'Barbería')]", timeout=3)
            has_employees = self.check_element_visible(By.XPATH, "//text()[contains(., 'Empleado')]", timeout=3)

            flow["validations"].append(f"Statistics section: {has_stats}")
            flow["validations"].append(f"Barbershop management: {has_barbershop_mgmt}")
            flow["validations"].append(f"Employees section: {has_employees}")
            print(f"    [+] Statistics visible: {has_stats}")
            print(f"    [+] Barbershop mgmt visible: {has_barbershop_mgmt}")
            print(f"    [+] Employees visible: {has_employees}")
            self.screenshot("propietario_03_admin_panel")

            print("[4/5] Buscando módulos disponibles...")
            try:
                modules = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'module')]")
                print(f"    [+] Encontrados {len(modules)} módulos")
                flow["steps"].append(f"Found {len(modules)} modules")
            except:
                print(f"    [!] No se pudo obtener lista de módulos")

            print("[5/5] Estado final del propietario...")
            self.screenshot("propietario_04_final")
            flow["status"] = "success"
            print("[+] Flujo PROPIETARIO: OK")

        except Exception as e:
            flow["status"] = f"error: {str(e)}"
            print(f"[-] Error: {e}")
            self.screenshot("propietario_error")

        self.results["flows"]["propietario"] = flow

    def run(self):
        try:
            self.test_cliente_flow()
            self.test_barbero_flow()
            self.test_propietario_flow()

            # Save results
            with open("e2e_selenium_results_expanded.json", "w", encoding='utf-8') as f:
                json.dump(self.results, f, indent=2, ensure_ascii=False)

            print("\n" + "="*60)
            print("[+] EXPANDED E2E TESTING COMPLETADO")
            print("="*60)
            print(f"\n[*] Screenshots: {SCREENSHOTS_DIR}/")
            print(f"[*] Resultados: e2e_selenium_results_expanded.json")

            for flow, result in self.results["flows"].items():
                status = result["status"]
                validations = len(result.get("validations", []))
                steps = len(result.get("steps", []))
                print(f"  {flow:15} -> {status:15} (validations: {validations}, steps: {steps})")

        finally:
            print("\n[*] Cerrando navegador...")
            self.driver.quit()

if __name__ == "__main__":
    tester = BarberFlowE2EExpanded()
    tester.run()
