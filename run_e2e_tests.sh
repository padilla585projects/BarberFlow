#!/bin/bash
# E2E Testing Runner for BarberFlow
# Ejecuta todos los tests de E2E disponibles

set -e

PROJECT_DIR="D:\Descargas\Projects\BarberAPP"
SCRIPTS_DIR="$PROJECT_DIR/scripts"

echo "========================================"
echo "  BarberFlow E2E Testing Suite"
echo "========================================"
echo ""

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "[ERROR] Python no está instalado"
    exit 1
fi

echo "[*] Directorio del proyecto: $PROJECT_DIR"
echo "[*] Directorio de scripts: $SCRIPTS_DIR"
echo ""

# Ask which tests to run
echo "¿Qué tests deseas ejecutar?"
echo "1) Solo login (rápido, ~3 min)"
echo "2) Con validaciones expandidas (~5 min)"
echo "3) Ambos"
read -p "Selecciona opción (1-3): " choice

cd "$PROJECT_DIR"

case $choice in
    1)
        echo ""
        echo "[*] Ejecutando tests de login básico..."
        python "$SCRIPTS_DIR/e2e_selenium.py"
        echo ""
        echo "[+] Tests completados. Ver: e2e_selenium_screenshots/"
        echo "[+] Resultados: e2e_selenium_results.json"
        ;;
    2)
        echo ""
        echo "[*] Ejecutando tests expandidos con validaciones..."
        python "$SCRIPTS_DIR/e2e_selenium_expanded.py"
        echo ""
        echo "[+] Tests completados. Ver: e2e_selenium_screenshots_expanded/"
        echo "[+] Resultados: e2e_selenium_results_expanded.json"
        ;;
    3)
        echo ""
        echo "[*] Ejecutando tests básicos..."
        python "$SCRIPTS_DIR/e2e_selenium.py"
        echo ""
        echo "[*] Ejecutando tests expandidos..."
        python "$SCRIPTS_DIR/e2e_selenium_expanded.py"
        echo ""
        echo "[+] Todos los tests completados"
        ;;
    *)
        echo "[ERROR] Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "[+] E2E Testing Suite finalizado"
echo "========================================"
