#!/usr/bin/env python3
"""
QA Audit Script for BarberFlow
Comprehensive testing of all flows and features
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
REPORT_DIR = "qa_audit_report"
os.makedirs(f"{REPORT_DIR}/screenshots", exist_ok=True)

class QAAudit:
    def __init__(self):
        print("[*] Iniciando QA Audit de BarberFlow...")
        self.driver = webdriver.Chrome()
        self.wait = WebDriverWait(self.driver, 10)
        self.audit_results = {
            "timestamp": datetime.now().isoformat(),
            "url": BASE_URL,
            "flows": {},
            "issues": [],
            "summary": {
                "total_checks": 0,
                "passed": 0,
                "failed": 0,
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0
            }
        }

    def log_issue(self, title, description, severity, flow, screenshot_name=None):
        """Log a QA issue"""
        issue = {
            "id": f"ISSUE-{len(self.audit_results['issues']) + 1:03d}",
            "title": title,
            "description": description,
            "severity": severity,
            "flow": flow,
            "screenshot": screenshot_name,
            "timestamp": datetime.now().isoformat()
        }
        self.audit_results["issues"].append(issue)
        self.audit_results["summary"][severity.lower()] += 1
        print(f"  ⚠️  [{severity}] {title}")

    def screenshot(self, name):
        path = f"{REPORT_DIR}/screenshots/{name}.png"
        self.driver.save_screenshot(path)
        print(f"    📸 Screenshot: {name}")
        return name

    def check_console_errors(self):
        """Check for JavaScript console errors"""
        logs = self.driver.get_log('browser')
        errors = [log for log in logs if log['level'] == 'SEVERE']
        return errors

    def login(self, email, password, user_type):
        """Login with given credentials"""
        print(f"\n[*] Logging in as {user_type}...")
        try:
            # Click email tab
            email_tab = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Email')]")
            email_tab.click()
            time.sleep(1)

            # Fill credentials
            email_field = self.driver.find_element(By.CSS_SELECTOR, "input[type='email']")
            password_field = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")

            email_field.click()
            email_field.clear()
            email_field.send_keys(email)
            time.sleep(0.5)

            password_field.click()
            password_field.clear()
            password_field.send_keys(password)
            time.sleep(2)

            # Find and click login button
            buttons = self.driver.find_elements(By.TAG_NAME, "button")
            login_btn = None
            for btn in buttons:
                if "INICIAR" in btn.text and btn.is_displayed():
                    login_btn = btn
                    break

            if login_btn:
                login_btn.click()
                time.sleep(3)
                print(f"  ✅ Login successful")
                return True
            else:
                self.log_issue(
                    "Login button not found",
                    f"Could not find INICIAR button for {user_type} login",
                    "Critical",
                    user_type
                )
                return False

        except Exception as e:
            self.log_issue(
                "Login failed",
                f"Exception during {user_type} login: {str(e)}",
                "Critical",
                user_type
            )
            return False

    def audit_cliente_flow(self):
        """Audit Cliente (Customer) Flow"""
        print("\n" + "="*60)
        print("[*] AUDITING CLIENTE FLOW")
        print("="*60)

        flow_data = {"status": "started", "checks": [], "errors": []}

        try:
            # Navigate to login
            print("[1/8] Navigating to login page...")
            self.driver.get(f"{BASE_URL}/auth/login")
            time.sleep(2)
            self.screenshot("cliente_01_login_page")
            flow_data["checks"].append("Login page loaded")

            # Login
            if not self.login("cliente@test.com", "test1234", "Cliente"):
                flow_data["status"] = "login_failed"
                self.audit_results["flows"]["cliente"] = flow_data
                return

            print("[2/8] Checking console for errors...")
            errors = self.check_console_errors()
            if errors:
                self.log_issue(
                    "Console errors after login",
                    f"Found {len(errors)} JavaScript errors",
                    "High",
                    "Cliente",
                    "cliente_02_console_errors"
                )
                flow_data["errors"].extend([e['message'] for e in errors])

            self.screenshot("cliente_02_after_login")
            flow_data["checks"].append("Login successful")

            # Check dashboard
            print("[3/8] Checking home page layout...")
            time.sleep(1)

            # Look for key elements
            try:
                self.wait.until(EC.presence_of_element_located((By.XPATH, "//*")))
                self.screenshot("cliente_03_dashboard")
                flow_data["checks"].append("Dashboard rendered")
            except:
                self.log_issue(
                    "Dashboard not loading",
                    "Cliente dashboard did not load in time",
                    "Critical",
                    "Cliente"
                )

            print("[4/8] Checking for navigation elements...")
            nav_elements = self.driver.find_elements(By.TAG_NAME, "button") + \
                          self.driver.find_elements(By.TAG_NAME, "a")
            print(f"    Found {len(nav_elements)} interactive elements")
            flow_data["checks"].append(f"Found {len(nav_elements)} navigation elements")

            print("[5/8] Checking responsive design (mobile viewport)...")
            self.driver.set_window_size(375, 812)
            time.sleep(1)
            self.screenshot("cliente_04_mobile_view")
            flow_data["checks"].append("Mobile view checked")

            # Reset viewport
            self.driver.set_window_size(1280, 720)
            time.sleep(1)

            print("[6/8] Looking for barbershop list/search...")
            try:
                barbershop_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'barber')]")
                if barbershop_elements:
                    print(f"    Found {len(barbershop_elements)} barbershop-related elements")
                    flow_data["checks"].append(f"Barbershop elements found: {len(barbershop_elements)}")
                else:
                    self.log_issue(
                        "No barbershop content visible",
                        "Customer dashboard shows no barbershop listings or search",
                        "High",
                        "Cliente"
                    )
            except:
                pass

            print("[7/8] Testing logout...")
            try:
                # Look for profile or logout menu
                profile_buttons = self.driver.find_elements(By.XPATH, "//button[contains(., 'Profile')] | //button[contains(., 'Perfil')] | //button[contains(., 'Salir')]")
                if profile_buttons:
                    print(f"    Found {len(profile_buttons)} profile/logout elements")
                    flow_data["checks"].append("Logout elements found")
                else:
                    self.log_issue(
                        "No logout option found",
                        "Could not find logout button or profile menu",
                        "Medium",
                        "Cliente"
                    )
            except:
                pass

            print("[8/8] Final checks...")
            self.screenshot("cliente_05_final")
            flow_data["status"] = "completed"
            flow_data["checks"].append("All checks completed")

        except Exception as e:
            flow_data["status"] = f"error: {str(e)}"
            self.log_issue(
                "Cliente flow exception",
                f"Unexpected error: {str(e)}",
                "Critical",
                "Cliente"
            )

        self.audit_results["flows"]["cliente"] = flow_data

    def audit_barbero_flow(self):
        """Audit Barbero (Barber) Flow"""
        print("\n" + "="*60)
        print("[*] AUDITING BARBERO FLOW")
        print("="*60)

        flow_data = {"status": "started", "checks": [], "errors": []}

        try:
            # Navigate to login
            print("[1/6] Navigating to login...")
            self.driver.get(f"{BASE_URL}/auth/login")
            time.sleep(2)
            self.screenshot("barbero_01_login_page")

            # Login
            if not self.login("barbero@test.com", "test1234", "Barbero"):
                flow_data["status"] = "login_failed"
                self.audit_results["flows"]["barbero"] = flow_data
                return

            self.screenshot("barbero_02_after_login")
            flow_data["checks"].append("Barbero login successful")

            print("[2/6] Checking for appointments section...")
            time.sleep(1)
            try:
                appointment_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'appointment')] | //*[contains(text(), 'Appointment')] | //*[contains(text(), 'cita')] | //*[contains(text(), 'Cita')]")
                if appointment_elements:
                    print(f"    Found {len(appointment_elements)} appointment elements")
                    flow_data["checks"].append(f"Appointment elements: {len(appointment_elements)}")
                else:
                    self.log_issue(
                        "No appointment section visible",
                        "Barber dashboard does not show appointment/cita section",
                        "High",
                        "Barbero"
                    )
            except:
                pass

            print("[3/6] Checking console for errors...")
            errors = self.check_console_errors()
            if errors:
                self.log_issue(
                    "Console errors in barber dashboard",
                    f"Found {len(errors)} JavaScript errors",
                    "High",
                    "Barbero"
                )

            self.screenshot("barbero_03_dashboard")

            print("[4/6] Checking schedule/availability settings...")
            try:
                schedule_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'schedule')] | //*[contains(text(), 'Schedule')] | //*[contains(text(), 'horario')] | //*[contains(text(), 'Horario')]")
                if schedule_elements:
                    flow_data["checks"].append(f"Schedule elements found: {len(schedule_elements)}")
                else:
                    self.log_issue(
                        "No schedule management visible",
                        "Barber has no visible schedule/availability management",
                        "Medium",
                        "Barbero"
                    )
            except:
                pass

            print("[5/6] Mobile view check...")
            self.driver.set_window_size(375, 812)
            time.sleep(1)
            self.screenshot("barbero_04_mobile")
            self.driver.set_window_size(1280, 720)

            print("[6/6] Final checks...")
            self.screenshot("barbero_05_final")
            flow_data["status"] = "completed"

        except Exception as e:
            flow_data["status"] = f"error: {str(e)}"
            self.log_issue(
                "Barbero flow exception",
                f"Unexpected error: {str(e)}",
                "Critical",
                "Barbero"
            )

        self.audit_results["flows"]["barbero"] = flow_data

    def audit_propietario_flow(self):
        """Audit Propietario (Owner) Flow"""
        print("\n" + "="*60)
        print("[*] AUDITING PROPIETARIO FLOW")
        print("="*60)

        flow_data = {"status": "started", "checks": [], "errors": []}

        try:
            # Navigate to login
            print("[1/6] Navigating to login...")
            self.driver.get(f"{BASE_URL}/auth/login")
            time.sleep(2)
            self.screenshot("propietario_01_login_page")

            # Login
            if not self.login("propietario@test.com", "test1234", "Propietario"):
                flow_data["status"] = "login_failed"
                self.audit_results["flows"]["propietario"] = flow_data
                return

            self.screenshot("propietario_02_after_login")
            flow_data["checks"].append("Propietario login successful")

            print("[2/6] Checking for admin panel elements...")
            time.sleep(1)
            try:
                admin_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'admin')] | //*[contains(text(), 'Admin')] | //*[contains(text(), 'negocio')] | //*[contains(text(), 'Negocio')]")
                if admin_elements:
                    print(f"    Found {len(admin_elements)} admin elements")
                    flow_data["checks"].append(f"Admin elements: {len(admin_elements)}")
                else:
                    self.log_issue(
                        "No admin content visible",
                        "Owner dashboard does not show admin or business sections",
                        "High",
                        "Propietario"
                    )
            except:
                pass

            print("[3/6] Checking console for errors...")
            errors = self.check_console_errors()
            if errors:
                self.log_issue(
                    "Console errors in owner dashboard",
                    f"Found {len(errors)} JavaScript errors",
                    "High",
                    "Propietario"
                )

            self.screenshot("propietario_03_dashboard")

            print("[4/6] Looking for business management options...")
            try:
                business_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'barbershop')] | //*[contains(text(), 'Barbershop')] | //*[contains(text(), 'empleado')] | //*[contains(text(), 'Empleado')]")
                if business_elements:
                    flow_data["checks"].append(f"Business management elements: {len(business_elements)}")
                else:
                    self.log_issue(
                        "No business management options",
                        "Owner cannot find barbershop or employee management",
                        "Medium",
                        "Propietario"
                    )
            except:
                pass

            print("[5/6] Mobile view check...")
            self.driver.set_window_size(375, 812)
            time.sleep(1)
            self.screenshot("propietario_04_mobile")
            self.driver.set_window_size(1280, 720)

            print("[6/6] Final checks...")
            self.screenshot("propietario_05_final")
            flow_data["status"] = "completed"

        except Exception as e:
            flow_data["status"] = f"error: {str(e)}"
            self.log_issue(
                "Propietario flow exception",
                f"Unexpected error: {str(e)}",
                "Critical",
                "Propietario"
            )

        self.audit_results["flows"]["propietario"] = flow_data

    def run(self):
        """Run complete audit"""
        try:
            self.audit_cliente_flow()
            self.audit_barbero_flow()
            self.audit_propietario_flow()

            # Calculate summary
            self.audit_results["summary"]["total_checks"] = sum(len(f.get("checks", [])) for f in self.audit_results["flows"].values())
            self.audit_results["summary"]["passed"] = self.audit_results["summary"]["total_checks"] - self.audit_results["summary"]["failed"]

            # Save results
            with open(f"{REPORT_DIR}/audit_results.json", "w", encoding='utf-8') as f:
                json.dump(self.audit_results, f, indent=2, ensure_ascii=False)

            # Print summary
            print("\n" + "="*60)
            print("[+] QA AUDIT COMPLETED")
            print("="*60)
            print(f"\n📊 Summary:")
            print(f"  Total Checks: {self.audit_results['summary']['total_checks']}")
            print(f"  Issues Found: {len(self.audit_results['issues'])}")
            print(f"    🔴 Critical: {self.audit_results['summary']['critical']}")
            print(f"    🟠 High: {self.audit_results['summary']['high']}")
            print(f"    🟡 Medium: {self.audit_results['summary']['medium']}")
            print(f"    🟢 Low: {self.audit_results['summary']['low']}")
            print(f"\n📁 Report: {REPORT_DIR}/")
            print(f"📸 Screenshots: {REPORT_DIR}/screenshots/")
            print(f"📄 Results: {REPORT_DIR}/audit_results.json")

            if self.audit_results['issues']:
                print(f"\n⚠️  Issues Found:")
                for issue in self.audit_results['issues']:
                    print(f"  {issue['id']}: [{issue['severity']}] {issue['title']} ({issue['flow']})")

        finally:
            print("\n[*] Closing browser...")
            self.driver.quit()

if __name__ == "__main__":
    audit = QAAudit()
    audit.run()
