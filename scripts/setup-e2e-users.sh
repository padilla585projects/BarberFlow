#!/bin/bash

# Setup usuarios de prueba para E2E Testing en Chrome
# Usa Firebase REST API directamente (sin Admin SDK)

FIREBASE_API_KEY="AIzaSyDvxYM-BYx9K4vX5R8-Q2j3nL7pMkOqW8E"
FIREBASE_PROJECT="barberflow-2026"

echo "🔐 Creando usuarios de prueba en Firebase..."
echo ""

# Función para crear usuario
create_user() {
    local email=$1
    local password=$2
    local display_name=$3

    echo "[*] Creando: $email ($display_name)"

    # Crear en Firebase Auth via REST API
    curl -s -X POST \
        "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$FIREBASE_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$password\",
            \"displayName\": \"$display_name\",
            \"returnSecureToken\": true
        }" | jq -r '.idToken' > /tmp/token_$email.txt

    local token=$(cat /tmp/token_$email.txt)

    if [ "$token" != "null" ] && [ ! -z "$token" ]; then
        echo "    ✅ Usuario creado exitosamente"
        echo "    📧 Email: $email"
        echo "    🔑 Password: $password"
        echo "    👤 Rol: $display_name"
    else
        error_msg=$(curl -s -X POST \
            "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$FIREBASE_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
                \"email\": \"$email\",
                \"password\": \"$password\",
                \"displayName\": \"$display_name\",
                \"returnSecureToken\": true
            }" | jq -r '.error.message')

        if [[ "$error_msg" == *"EMAIL_EXISTS"* ]]; then
            echo "    ⚠️  Email ya existe - ignorando"
        else
            echo "    ❌ Error: $error_msg"
        fi
    fi
    echo ""
}

# Crear usuarios
create_user "cliente@test.com" "Test123456" "Cliente Test"
create_user "barbero@test.com" "Test123456" "Barbero Test"
create_user "propietario@test.com" "Test123456" "Propietario Test"

echo "✅ Usuarios de prueba configurados"
echo ""
echo "📝 Credenciales disponibles:"
echo "   cliente@test.com / Test123456"
echo "   barbero@test.com / Test123456"
echo "   propietario@test.com / Test123456"
echo ""
echo "🌐 Abre en Chrome: https://barberflow-2026.web.app"
