# Start Live Testing Session
# Abre terminal con logs, app en HTC y Chrome con web-admin

param([string]$deviceId = "HT54BYJ01402")

$adbPath = "D:\Android\Sdk\platform-tools\adb.exe"

if (-not (Test-Path $adbPath)) {
    Write-Host "ERROR: ADB not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         BARBERFLOW - LIVE TESTING SESSION                 ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║  Starting 3 windows:                                       ║" -ForegroundColor Cyan
Write-Host "║  1. Terminal - Logs en tiempo real (HTC M9)               ║" -ForegroundColor Cyan
Write-Host "║  2. HTC - App Móvil (Barbero flow)                        ║" -ForegroundColor Cyan
Write-Host "║  3. Chrome - Web Admin (Owner dashboard)                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar que el dispositivo está conectado
Write-Host "Verificando dispositivo..." -ForegroundColor Yellow
$devices = & $adbPath devices -l | Select-String "device$"

if (-not ($devices -like "*$deviceId*")) {
    Write-Host "ERROR: Dispositivo $deviceId no encontrado" -ForegroundColor Red
    Write-Host "Dispositivos conectados:" -ForegroundColor Yellow
    & $adbPath devices -l
    exit 1
}

Write-Host "✅ Dispositivo encontrado: $deviceId" -ForegroundColor Green
Write-Host ""

# Paso 2: Abrir terminal con logs
Write-Host "Abriendo terminal con logs en tiempo real..." -ForegroundColor Cyan
$logCommand = "& '$adbPath' -s $deviceId logcat -s 'ReactNativeJS:*'"

# Crear un script para PowerShell que abra en nueva ventana
$logScript = @"
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         LIVE LOGS - HTC M9 React Native                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para salir" -ForegroundColor Yellow
Write-Host ""

& '$adbPath' -s '$deviceId' logcat -s "ReactNativeJS:*"
"@

$logScriptPath = "$env:TEMP\barberflow_logs.ps1"
Set-Content -Path $logScriptPath -Value $logScript

Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {$logScript}"
Write-Host "✅ Terminal de logs abierta" -ForegroundColor Green
Write-Host ""

# Paso 3: Lanzar app en HTC
Write-Host "Lanzando app en HTC..." -ForegroundColor Cyan
& $adbPath -s $deviceId shell am start -n com.barberflow/.MainActivity | Out-Null
Write-Host "✅ App lanzada en HTC" -ForegroundColor Green
Write-Host ""

# Esperar un poco
Start-Sleep -Seconds 2

# Paso 4: Abrir Chrome con web-admin
Write-Host "Abriendo Chrome con web-admin..." -ForegroundColor Cyan

$chromeUrl = "https://barberflow-2026.web.app"
$chromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"

if (Test-Path $chromeExe) {
    & $chromeExe $chromeUrl
    Write-Host "✅ Chrome abierto" -ForegroundColor Green
} else {
    Write-Host "⚠️  Chrome no encontrado en ruta predeterminada" -ForegroundColor Yellow
    Write-Host "URL para abrir manualmente:" -ForegroundColor White
    Write-Host "  $chromeUrl" -ForegroundColor Cyan

    # Intentar abrir con comando start default
    Start-Process $chromeUrl
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         LIVE TESTING SESSION STARTED                      ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║  Ahora tienes 3 ventanas abiertas:                        ║" -ForegroundColor Green
Write-Host "║  1. Terminal con logs                                     ║" -ForegroundColor Green
Write-Host "║  2. HTC con app móvil                                     ║" -ForegroundColor Green
Write-Host "║  3. Chrome con web-admin                                  ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║  Sigue la guía en: LIVE_TESTING_GUIDE.md                 ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║  Tips:                                                     ║" -ForegroundColor Green
Write-Host "║  - Terminal: Revisa logs mientras usas la app             ║" -ForegroundColor Green
Write-Host "║  - HTC: Navega: Login → Mis Citas → Mi Horario → Logout   ║" -ForegroundColor Green
Write-Host "║  - Chrome: Revisa Settings → Employees → Services → etc   ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "Presiona Enter para ver más instrucciones..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "CREDENCIALES PARA LOGIN:" -ForegroundColor Cyan
Write-Host ""
Write-Host "HTC M9 (Barbero):" -ForegroundColor Magenta
Write-Host "  Email: barbero@test.com" -ForegroundColor White
Write-Host "  Password: test1234" -ForegroundColor White
Write-Host ""
Write-Host "Chrome (Owner):" -ForegroundColor Magenta
Write-Host "  Email: propietario@test.com" -ForegroundColor White
Write-Host "  Password: test1234" -ForegroundColor White
Write-Host ""

Write-Host "TESTS A EJECUTAR:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  BARBERO (HTC):" -ForegroundColor Yellow
Write-Host "    1. Login" -ForegroundColor White
Write-Host "    2. Mis Citas - ver lista y completar una" -ForegroundColor White
Write-Host "    3. Mi Horario - editar y guardar" -ForegroundColor White
Write-Host "    4. Logout" -ForegroundColor White
Write-Host "    5. Revisar terminal para sin errors" -ForegroundColor White
Write-Host ""
Write-Host "  OWNER (Chrome):" -ForegroundColor Yellow
Write-Host "    1. Login" -ForegroundColor White
Write-Host "    2. Settings - ver/editar barbershop" -ForegroundColor White
Write-Host "    3. Employees - ver lista" -ForegroundColor White
Write-Host "    4. Services - ver/editar servicios" -ForegroundColor White
Write-Host "    5. Analytics - ver gráficos" -ForegroundColor White
Write-Host ""

Write-Host "Presiona Enter para terminar esta ventana..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "✅ Session iniciada." -ForegroundColor Green
Write-Host "Mantén todas las ventanas abiertas mientras haces testing." -ForegroundColor Green
