# BarberFlow Mobile Testing Script (Windows PowerShell)
# Execute this on your machine with ADB configured and devices connected
# Usage: .\test-mobile.ps1

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogFile = Join-Path $ScriptDir "mobile-test-results.log"
$ReportFile = Join-Path $ScriptDir "mobile-test-report.txt"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "BarberFlow Mobile Testing Script (Windows)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Start time: $(Get-Date)" -ForegroundColor Yellow

Add-Content -Path $LogFile -Value "Test started: $(Get-Date)"

# ─────────────────────────────────────────────────────
# STEP 1: Verify Prerequisites
# ─────────────────────────────────────────────────────

Write-Host ""
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Cyan

# Check ADB
try {
    $adbPath = & where.exe adb.exe 2>$null
    if ($null -eq $adbPath) {
        throw "ADB not found"
    }
    Write-Host "✅ ADB found: $adbPath" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: ADB not found in PATH" -ForegroundColor Red
    Write-Host "Install Android SDK Platform Tools and add to PATH" -ForegroundColor Red
    exit 1
}

# Check Node
try {
    $nodeVersion = & node --version 2>$null
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Node.js not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites OK" -ForegroundColor Green

# ─────────────────────────────────────────────────────
# STEP 2: Check Connected Devices
# ─────────────────────────────────────────────────────

Write-Host ""
Write-Host "[2/5] Checking connected devices..." -ForegroundColor Cyan

try {
    $devices = & adb devices -l
    $deviceList = $devices | Select-Object -Skip 1 | Where-Object { $_ -match "device$" }
    $deviceCount = ($deviceList | Measure-Object).Count

    if ($deviceCount -eq 0) {
        Write-Host "❌ ERROR: No devices found!" -ForegroundColor Red
        Write-Host "Please connect devices and run: adb devices" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Found $deviceCount device(s)" -ForegroundColor Green
    Write-Host ""
    Write-Host $devices
} catch {
    Write-Host "❌ ERROR checking devices: $_" -ForegroundColor Red
    exit 1
}

# ─────────────────────────────────────────────────────
# STEP 3: Build Mobile App
# ─────────────────────────────────────────────────────

Write-Host ""
Write-Host "[3/5] Preparing mobile app..." -ForegroundColor Cyan

$mobileDir = Join-Path $ScriptDir "mobile"

if (-not (Test-Path (Join-Path $mobileDir "node_modules"))) {
    Write-Host "Installing dependencies..."
    Push-Location $mobileDir
    & npm install
    Pop-Location
}

Write-Host "✅ Build preparation complete" -ForegroundColor Green
Write-Host ""
Write-Host "To run on Android device, execute:" -ForegroundColor Yellow
Write-Host "  cd $mobileDir" -ForegroundColor Yellow
Write-Host "  npm run android" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or with Expo:" -ForegroundColor Yellow
Write-Host "  npm start" -ForegroundColor Yellow
Write-Host "  Scan QR code with device" -ForegroundColor Yellow

# ─────────────────────────────────────────────────────
# STEP 4: Generate Test Report
# ─────────────────────────────────────────────────────

Write-Host ""
Write-Host "[4/5] Generating test checklist..." -ForegroundColor Cyan

$reportContent = @"
================================================================================
BARBERFLOW MOBILE TESTING REPORT
================================================================================

Test Date: $(Get-Date)
Devices Tested:
  - U11 (Cliente)
  - M9 (Barbero)
  - HT54BYJ01402 (Barbero)

================================================================================
CLIENTE FLOW (U11)
================================================================================

[ ] Login with cliente@test.com / test1234
[ ] Dashboard loads successfully
[ ] Can navigate to Profile
[ ] Logout button visible in Profile
[ ] Logout confirmation dialog appears
[ ] After logout, redirected to login screen
[ ] No console errors during flow

ISSUE-002 VALIDATION: ✅ LOGOUT FUNCIONA EN CLIENTE

================================================================================
BARBERO FLOW (M9)
================================================================================

[ ] Login with barbero@test.com / test1234
[ ] Dashboard loads successfully
[ ] "Mis Citas" (Appointments) section visible
[ ] Appointments list shows data:
    [ ] Client name
    [ ] Date and time
    [ ] Service name
    [ ] Duration
    [ ] Appointment status
[ ] Pull-to-refresh works (swipe down)
[ ] Can tap "Completado" button
[ ] Can tap "Cancelar" button
[ ] Status changes and persists

ISSUE-003 VALIDATION: ✅ APPOINTMENTS FUNCIONAN EN BARBERO

[ ] Navigate to "Mi Horario" (Schedule Management)
[ ] Schedule screen shows 7 days (Monday-Sunday)
[ ] Each day shows:
    [ ] Toggle (open/closed)
    [ ] Start time picker
    [ ] End time picker
    [ ] Add breaks option
    [ ] Mark as day off option
[ ] Can edit start time for Monday
[ ] Time picker opens and allows selection
[ ] Changes show in UI
[ ] Can add break times
[ ] Can save schedule
[ ] Success message appears
[ ] Close and reopen app
[ ] Changes are still there (persisted)

ISSUE-005 VALIDATION: ✅ SCHEDULE MANAGEMENT FUNCIONA

[ ] Navigate to Profile/Settings
[ ] Logout button visible
[ ] Tap logout
[ ] Confirmation dialog appears
[ ] Confirm logout
[ ] Redirected to login screen
[ ] No console errors

ISSUE-002 VALIDATION: ✅ LOGOUT FUNCIONA EN BARBERO

[ ] Open React Native Debugger or Flipper
[ ] Navigate through all barber screens
[ ] Check console for errors:
    [ ] No red X errors
    [ ] No Firebase permission errors
    [ ] No network errors
    [ ] No type errors

ISSUE-004 VALIDATION: ✅ SIN CONSOLE ERRORS EN BARBERO

================================================================================
GENERAL VALIDATION
================================================================================

[ ] App doesn't crash
[ ] Navigation is smooth
[ ] Buttons respond to taps
[ ] Forms validate correctly
[ ] Real-time data updates work
[ ] No unexpected behavior

================================================================================
SUMMARY
================================================================================

Total Tests: 40+
Tests Passed: ___
Tests Failed: ___

Overall Status:
  [ ] ✅ ALL TESTS PASSED - READY FOR PRODUCTION
  [ ] ⚠️  SOME TESTS FAILED - SEE DETAILS BELOW
  [ ] ❌ MAJOR ISSUES - DO NOT RELEASE

Issues Found (if any):
─────────────────────
[Describe any issues encountered]

Notes:
─────────────────────
[Add any additional notes or observations]

Tester Name: _______________________
Test Date: _______________________
Sign-off: _________________________

================================================================================
"@

Set-Content -Path $ReportFile -Value $reportContent
Write-Host "✅ Test report generated: $ReportFile" -ForegroundColor Green

# ─────────────────────────────────────────────────────
# STEP 5: Summary
# ─────────────────────────────────────────────────────

Write-Host ""
Write-Host "[5/5] Summary" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Mobile testing setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Connect U11 and M9 devices via USB" -ForegroundColor White
Write-Host "  2. Run: npm run android (from mobile\ directory)" -ForegroundColor White
Write-Host "  3. Or run: npm start and scan QR code" -ForegroundColor White
Write-Host "  4. Follow checklist in: $ReportFile" -ForegroundColor White
Write-Host "  5. Mark tests as you complete them" -ForegroundColor White
Write-Host "  6. Submit completed report" -ForegroundColor White
Write-Host ""
Write-Host "For real-time logs:" -ForegroundColor Yellow
Write-Host "  adb logcat -s ReactNativeJS:*" -ForegroundColor White
Write-Host ""
Write-Host "For debugging:" -ForegroundColor Yellow
Write-Host "  npm start (from mobile\ directory)" -ForegroundColor White
Write-Host "  Press 'd' in terminal to open React Native Debugger" -ForegroundColor White
Write-Host ""

Add-Content -Path $LogFile -Value "Setup completed: $(Get-Date)"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Ready for mobile testing!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
