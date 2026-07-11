@echo off
REM BarberFlow Mobile Testing Script - Windows Batch
REM Execute this on your machine with ADB configured and devices connected
REM Verifica y compila la app en los dispositivos conectados

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ==================================================
echo BarberFlow Mobile Testing Script
echo ==================================================
echo.

REM Step 1: Verificar ADB
echo [1/6] Verificando ADB...
where adb >nul 2>&1
if errorlevel 1 (
    echo ERROR: ADB no encontrado en PATH
    echo Por favor instala Android SDK Platform Tools
    exit /b 1
)
echo OK: ADB disponible

REM Step 2: Listar dispositivos
echo.
echo [2/6] Verificando dispositivos conectados...
adb devices -l
adb devices -l | find "device" >nul
if errorlevel 1 (
    echo ERROR: No hay dispositivos conectados
    echo Conecta U11 y M9 via USB
    exit /b 1
)
echo OK: Dispositivos detectados

REM Step 3: Verificar Node
echo.
echo [3/6] Verificando dependencias...
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js/npm no encontrado
    exit /b 1
)
echo OK: Node.js disponible

REM Step 4: Instalar dependencias de mobile app
echo.
echo [4/6] Instalando dependencias...
cd mobile
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)
echo OK: Dependencias instaladas
cd ..

REM Step 5: Compilar para Android
echo.
echo [5/6] Compilando app para Android...
cd mobile
call npm run android
if errorlevel 1 (
    echo ERROR: Build fallido
    echo Intenta: npm run android nuevamente
    cd ..
    exit /b 1
)
cd ..
echo OK: App compilada

REM Step 6: Esperar y mostrar instrucciones
echo.
echo [6/6] Setup completado!
echo.
echo ==================================================
echo MOBILE TESTING - PROXIMOS PASOS
echo ==================================================
echo.
echo La app deberia estar instalada en:
echo   - U11 (Cliente)
echo   - M9 (Barbero)
echo.
echo Abre TESTING_INSTRUCTIONS.md para validar:
echo   ISSUE-001: Firebase 400 error handling
echo   ISSUE-002: Logout functionality
echo   ISSUE-003: Appointments list (Barber)
echo   ISSUE-004: Console errors
echo   ISSUE-005: Schedule management
echo.
echo Para ver logs en real-time:
echo   adb logcat -s "ReactNativeJS:*"
echo.
echo Para debugging:
echo   npm start (en directorio mobile/)
echo   Luego presiona 'd' en la terminal
echo.
echo ==================================================
pause
