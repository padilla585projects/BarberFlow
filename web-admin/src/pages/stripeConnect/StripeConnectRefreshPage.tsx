export default function StripeConnectRefreshPage() {
  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      minHeight: '100vh',
      color: '#e0e0e0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px',
    }}>
      <div style={{ maxWidth: 480 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          backgroundColor: 'rgba(201, 168, 76, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 32,
          color: '#C9A84C',
        }}>
          ⟳
        </div>

        <h1 style={{
          color: '#C9A84C',
          fontSize: 26,
          fontWeight: 700,
          marginBottom: 12,
        }}>
          El enlace de registro ha caducado
        </h1>

        <p style={{ color: '#ccc', fontSize: 16, lineHeight: 1.6, marginBottom: 8 }}>
          El proceso de registro con Stripe se interrumpió o el enlace ya no es válido.
        </p>

        <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, marginTop: 24 }}>
          Vuelve a la app BarberFlow, entra en Ajustes → Métodos de pago y pulsa de nuevo
          en "Conectar con Stripe" para generar un enlace nuevo.
        </p>
      </div>
    </div>
  )
}
