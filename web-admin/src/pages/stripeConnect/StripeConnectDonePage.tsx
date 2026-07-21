export default function StripeConnectDonePage() {
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
          fontSize: 36,
          color: '#C9A84C',
        }}>
          ✓
        </div>

        <h1 style={{
          color: '#C9A84C',
          fontSize: 26,
          fontWeight: 700,
          marginBottom: 12,
        }}>
          Cuenta de Stripe conectada
        </h1>

        <p style={{ color: '#ccc', fontSize: 16, lineHeight: 1.6, marginBottom: 8 }}>
          Ya has completado el registro de tu cuenta de Stripe. Los cobros de tus clientes
          se ingresarán directamente en tu cuenta.
        </p>

        <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, marginTop: 24 }}>
          Puedes cerrar esta ventana y volver a la app BarberFlow. Si Stripe sigue revisando
          algún dato de tu empresa, verás el estado actualizado en unos minutos en
          Ajustes → Métodos de pago.
        </p>
      </div>
    </div>
  )
}
