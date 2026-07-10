#!/bin/bash
# BarberFlow Mobile Testing Script
# Execute this on your machine with ADB configured and devices connected
# Usage: bash test-mobile.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/mobile-test-results.log"
REPORT_FILE="$SCRIPT_DIR/mobile-test-report.txt"

echo "=================================================="
echo "BarberFlow Mobile Testing Script"
echo "=================================================="
echo "Start time: $(date)" | tee -a "$LOG_FILE"

# ─────────────────────────────────────────────────────
# STEP 1: Verify Prerequisites
# ─────────────────────────────────────────────────────

echo ""
echo "[1/5] Checking prerequisites..."

# Check ADB
if ! command -v adb &> /dev/null; then
    echo "❌ ERROR: ADB not found in PATH"
    echo "Install Android SDK Platform Tools and add to PATH"
    exit 1
fi

# Check Expo
if ! command -v expo &> /dev/null; then
    echo "⚠️  WARNING: Expo not found. Install with: npm install -g expo-cli"
    echo "Continuing anyway..."
fi

echo "✅ Prerequisites OK"

# ─────────────────────────────────────────────────────
# STEP 2: Check Connected Devices
# ─────────────────────────────────────────────────────

echo ""
echo "[2/5] Checking connected devices..."

DEVICES=$(adb devices -l | grep -v "^List" | grep device | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ ERROR: No devices found!"
    echo "Please connect devices and run: adb devices"
    exit 1
fi

echo "✅ Found $DEVICES device(s)"
adb devices -l

# ─────────────────────────────────────────────────────
# STEP 3: Build Mobile App
# ─────────────────────────────────────────────────────

echo ""
echo "[3/5] Building mobile app..."

cd "$SCRIPT_DIR/mobile"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Build preparation complete"
echo "To run on Android device, execute:"
echo "  cd $SCRIPT_DIR/mobile"
echo "  npm run android"
echo ""
echo "Or with Expo:"
echo "  npm start"
echo "  Scan QR code with device"

# ─────────────────────────────────────────────────────
# STEP 4: Generate Test Report
# ─────────────────────────────────────────────────────

echo ""
echo "[4/5] Generating test checklist..."

cat > "$REPORT_FILE" << 'EOF'
================================================================================
BARBERFLOW MOBILE TESTING REPORT
================================================================================

Test Date: $(date)
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
EOF

echo "✅ Test report generated: $REPORT_FILE"

# ─────────────────────────────────────────────────────
# STEP 5: Summary
# ─────────────────────────────────────────────────────

echo ""
echo "[5/5] Summary"
echo ""
echo "✅ Mobile testing setup complete!"
echo ""
echo "Next steps:"
echo "  1. Connect U11 and M9 devices via USB"
echo "  2. Run: npm run android (from mobile/ directory)"
echo "  3. Or run: npm start and scan QR code"
echo "  4. Follow checklist in: $REPORT_FILE"
echo "  5. Mark tests as you complete them"
echo "  6. Submit completed report"
echo ""
echo "For real-time logs:"
echo "  adb logcat -s ReactNativeJS:*"
echo ""
echo "For debugging:"
echo "  npm start"
echo "  Press 'd' in terminal to open React Native Debugger"
echo ""

echo "Test started: $(date)" >> "$LOG_FILE"
echo "Completed setup: $(date)" >> "$LOG_FILE"

echo "=================================================="
echo "Ready for mobile testing!"
echo "=================================================="
