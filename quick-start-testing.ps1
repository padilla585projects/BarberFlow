#!/usr/bin/env pwsh
# Quick start live testing - HTC M9 + Chrome

$adbPath = "D:\Android\Sdk\platform-tools\adb.exe"
$deviceId = "HT54BYJ01402"

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "BARBERFLOW - LIVE TESTING SESSION" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Check device
Write-Host "1. Verificando dispositivo..." -ForegroundColor Yellow
$devices = & $adbPath devices -l
if ($devices -like "*$deviceId*") {
    Write-Host "   OK: Dispositivo $deviceId conectado" -ForegroundColor Green
} else {
    Write-Host "   ERROR: Dispositivo no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Abriendo terminal de logs..." -ForegroundColor Yellow
$logCmd = "& '$adbPath' -s $deviceId logcat -s `"ReactNativeJS:*`""
Start-Process powershell -ArgumentList "-Command", $logCmd

Write-Host "   OK: Terminal abierta (revisa la nueva ventana)" -ForegroundColor Green

Write-Host ""
Write-Host "3. Lanzando app en HTC M9..." -ForegroundColor Yellow
& $adbPath -s $deviceId shell am start -n com.barberflow/.MainActivity
Write-Host "   OK: App lanzada" -ForegroundColor Green

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "4. Abriendo Chrome con web-admin..." -ForegroundColor Yellow
$chromeUrl = "https://barberflow-2026.web.app"
$chromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"

if (Test-Path $chromeExe) {
    & $chromeExe $chromeUrl
    Write-Host "   OK: Chrome abierto" -ForegroundColor Green
} else {
    Write-Host "   Abre manualmente: $chromeUrl" -ForegroundColor Yellow
    Start-Process $chromeUrl
}

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
Write-Host "SETUP COMPLETO" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora tienes 3 ventanas:" -ForegroundColor Cyan
Write-Host "  1. Terminal con LOGS del HTC (revisa continuamente)" -ForegroundColor White
Write-Host "  2. HTC M9 con APP MOBILE (Barbero flow)" -ForegroundColor White
Write-Host "  3. Chrome con WEB-ADMIN (Owner dashboard)" -ForegroundColor White
Write-Host ""
Write-Host "CREDENCIALES:" -ForegroundColor Cyan
Write-Host "  HTC:    barbero@test.com / test1234" -ForegroundColor White
Write-Host "  Chrome: propietario@test.com / test1234" -ForegroundColor White
Write-Host ""
Write-Host "TESTS:" -ForegroundColor Cyan
Write-Host "  HTC: Login -> Mis Citas -> Mi Horario -> Logout" -ForegroundColor White
Write-Host "  Chrome: Login -> Settings -> Employees -> Services -> Analytics" -ForegroundColor White
Write-Host ""
Write-Host "REFERENCIA: LIVE_TESTING_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
