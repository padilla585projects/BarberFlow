# Create test owner user in Firebase using REST API

$apiKey = "AIzaSyCkJOmEDgREdMNcXZqwRTBmPPPDCsVwkpM"
$firebaseUrl = "https://barberflow-2026.firebaseapp.com"

$users = @(
    @{
        email = "propietario@test.com"
        password = "test1234"
        displayName = "Owner Test"
        role = "owner"
    },
    @{
        email = "cliente@test.com"
        password = "test1234"
        displayName = "Cliente Test"
        role = "client"
    },
    @{
        email = "barbero@test.com"
        password = "test1234"
        displayName = "Barbero Test"
        role = "barber"
    }
)

Write-Host "Creating test users in Firebase..." -ForegroundColor Cyan
Write-Host ""

foreach ($user in $users) {
    Write-Host "Creating: $($user.email)" -ForegroundColor Yellow

    # Step 1: Sign up with email/password
    $signupUrl = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey"
    $signupBody = @{
        email = $user.email
        password = $user.password
        returnSecureToken = $true
    } | ConvertTo-Json

    try {
        $signupResponse = Invoke-RestMethod -Uri $signupUrl -Method Post -Body $signupBody -ContentType "application/json" -ErrorAction Stop
        $uid = $signupResponse.localId

        Write-Host "  ✅ Auth user created: $uid" -ForegroundColor Green
        Write-Host "  ✅ Credentials: $($user.email) / $($user.password)" -ForegroundColor Green
        Write-Host ""

    } catch {
        $error = $_.Exception.Response.Content | ConvertFrom-Json
        if ($error.error.message -like "*EMAIL_EXISTS*") {
            Write-Host "  ⚠️  User already exists" -ForegroundColor Yellow
            Write-Host "  ⚠️  Can login with: $($user.email) / $($user.password)" -ForegroundColor Yellow
        } else {
            Write-Host "  ❌ Error: $($error.error.message)" -ForegroundColor Red
        }
        Write-Host ""
    }
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "Test users ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Try logging in to: https://barberflow-2026.web.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Credentials:" -ForegroundColor Yellow
Write-Host "  Owner:  propietario@test.com / test1234" -ForegroundColor White
Write-Host "  Client: cliente@test.com / test1234" -ForegroundColor White
Write-Host "  Barber: barbero@test.com / test1234" -ForegroundColor White
