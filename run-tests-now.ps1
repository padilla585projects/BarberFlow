# Script PowerShell para ejecutar tests en móviles
# Este script busca ADB y ejecuta las pruebas

param([string]$action = "test")

# Buscar ADB
$adbPaths = @(
    "C:\Users\adpar\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "C:\Android\Sdk\platform-tools\adb.exe",
    "$env:ANDROID_HOME\platform-tools\adb.exe",
    (Get-Command adb -ErrorAction SilentlyContinue).Source
)

$adbPath = $null
foreach ($path in $adbPaths) {
    if ($path -and (Test-Path $path)) {
        $adbPath = $path
        break
    }
}

if (-not $adbPath) {
    Write-Host "ERROR: ADB no encontrado" -ForegroundColor Red
    Write-Host "Ubicaciones buscadas:" -ForegroundColor Yellow
    $adbPaths | Where-Object { $_ } | ForEach-Object { Write-Host "  $_" }
    exit 1
}

Write-Host "ADB encontrado en: $adbPath" -ForegroundColor Green
Write-Host ""

# Listar dispositivos
Write-Host "Dispositivos conectados:" -ForegroundColor Cyan
& $adbPath devices -l
Write-Host ""

# Obtener dispositivos como array
$devicesOutput = & $adbPath devices -l
$devices = @()
foreach ($line in $devicesOutput) {
    if ($line -match "^[\w-]+" -and $line -notmatch "List" -and $line.Trim()) {
        $parts = $line -split '\s+'
        if ($parts.Count -ge 2 -and $parts[1] -eq "device") {
            $devices += $parts[0]
        }
    }
}

if ($devices.Count -eq 0) {
    Write-Host "ERROR: No hay dispositivos conectados" -ForegroundColor Red
    exit 1
}

Write-Host "Encontrados: $($devices.Count) dispositivo(s)" -ForegroundColor Green
$devices | ForEach-Object { Write-Host "  - $_" }
Write-Host ""

# Compilar app
Write-Host "Compilando app para Android..." -ForegroundColor Cyan
Push-Location "mobile"
& npm run android 2>&1 | Tee-Object -FilePath "build.log"
$buildSuccess = $LASTEXITCODE -eq 0
Pop-Location

if ($buildSuccess) {
    Write-Host "Build exitoso!" -ForegroundColor Green
} else {
    Write-Host "Build falló" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Setup Completado" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "App instalada en:" -ForegroundColor Yellow
$devices | ForEach-Object { Write-Host "  - $_" }
Write-Host ""
Write-Host "PROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abre la app en cada dispositivo" -ForegroundColor White
Write-Host "2. Sigue el checklist en TESTING_INSTRUCTIONS.md:" -ForegroundColor White
Write-Host ""
Write-Host "   CLIENTE (U11):" -ForegroundColor Magenta
Write-Host "     - Login: cliente@test.com / test1234" -ForegroundColor White
Write-Host "     - Validar logout funciona" -ForegroundColor White
Write-Host ""
Write-Host "   BARBERO (M9):" -ForegroundColor Magenta
Write-Host "     - Login: barbero@test.com / test1234" -ForegroundColor White
Write-Host "     - Validar Mis Citas (Appointments)" -ForegroundColor White
Write-Host "     - Validar Mi Horario (Schedule)" -ForegroundColor White
Write-Host "     - Validar logout funciona" -ForegroundColor White
Write-Host "     - Verificar console sin errores" -ForegroundColor White
Write-Host ""
Write-Host "Para ver logs en real-time:" -ForegroundColor Yellow
Write-Host "  adb logcat -s ReactNativeJS" -ForegroundColor White
Write-Host ""
Write-Host "Para debugging:" -ForegroundColor Yellow
Write-Host "  cd mobile" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host "  Presiona 'd' en la terminal" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Generar reporte
$report = @"
================================================================================
BARBERFLOW MOBILE TESTING REPORT
Generado: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
================================================================================

DISPOSITIVOS:
$($devices -join "`n")

ISSUES A VALIDAR:
  [ ] ISSUE-001: Firebase 400 error handling (Verificar en login)
  [ ] ISSUE-002: Logout funciona (Cliente y Barbero)
  [ ] ISSUE-003: Mis Citas visible y funcional (Barbero)
  [ ] ISSUE-004: Sin console errors (Barbero)
  [ ] ISSUE-005: Mi Horario funciona (Barbero)
  [ ] ISSUE-006: Owner dashboard (Web-admin)
  [ ] ISSUE-007: Business management (Web-admin)

TEST CHECKLIST:

CLIENTE (U11):
  [ ] Login exitoso
  [ ] Dashboard carga
  [ ] Logout visible
  [ ] Logout funciona
  [ ] Redirige a login
  [ ] Sin console errors

BARBERO (M9):
  [ ] Login exitoso
  [ ] Mis Citas visible
  [ ] Mis Citas con datos
  [ ] Mi Horario accesible
  [ ] Puede editar horario
  [ ] Puede guardar horario
  [ ] Cambios persisten
  [ ] Logout funciona
  [ ] Sin console errors

VALIDACION GENERAL:
  [ ] App no crashea
  [ ] Navegacion fluida
  [ ] Botones responden
  [ ] Real-time updates funcionan

RESULTADO FINAL:
  Status: ___________________
  Tester: ___________________
  Fecha:  ___________________

OBSERVACIONES:
_________________________________________________________________

================================================================================
"@

$report | Out-File -Encoding UTF8 "mobile-test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
Write-Host "Reporte guardado" -ForegroundColor Green

Write-Host ""
Write-Host "Presiona Enter para continuar..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
