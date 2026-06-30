import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      minHeight: '100vh',
      color: '#e0e0e0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      lineHeight: 1.7,
    }}>
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '40px 24px 80px',
      }}>
        <Link
          to="/dashboard"
          style={{
            color: '#C9A84C',
            textDecoration: 'none',
            fontSize: 14,
            display: 'inline-block',
            marginBottom: 32,
          }}
        >
          &larr; Volver
        </Link>

        <h1 style={{
          color: '#C9A84C',
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 8,
        }}>
          Politica de Privacidad
        </h1>

        <p style={{ color: '#888', fontSize: 14, marginBottom: 40 }}>
          Ultima actualizacion: Junio 2026
        </p>

        <Section title="1. Informacion general">
          <p>
            Esta politica de privacidad describe como <strong>BarberFlow</strong> (en adelante, "la aplicacion")
            recopila, utiliza y protege la informacion personal de sus usuarios. Al utilizar BarberFlow,
            aceptas las practicas descritas en este documento.
          </p>
        </Section>

        <Section title="2. Datos que recopilamos">
          <p>Recopilamos los siguientes tipos de informacion:</p>
          <ul style={{ paddingLeft: 24, marginTop: 8 }}>
            <li><strong>Nombre completo</strong> — proporcionado durante el registro.</li>
            <li><strong>Correo electronico</strong> — utilizado para la autenticacion y comunicaciones.</li>
            <li><strong>Foto de perfil</strong> (opcional) — subida voluntariamente por el usuario.</li>
            <li><strong>Tokens de notificaciones push</strong> — generados automaticamente para el envio de notificaciones.</li>
            <li><strong>Reportes de errores</strong> — recopilados automaticamente a traves de Sentry para monitoreo de estabilidad.</li>
            <li><strong>Eventos de analitica</strong> — datos anonimizados de uso para mejorar la experiencia.</li>
          </ul>
        </Section>

        <Section title="3. Finalidad del tratamiento de datos">
          <p>Utilizamos la informacion recopilada para los siguientes fines:</p>
          <ul style={{ paddingLeft: 24, marginTop: 8 }}>
            <li>Proporcionar y mantener la funcionalidad de la aplicacion.</li>
            <li>Enviar notificaciones push relevantes (citas, recordatorios, promociones).</li>
            <li>Monitorear y corregir errores tecnicos mediante Sentry.</li>
            <li>Analizar patrones de uso para mejorar la experiencia del usuario.</li>
          </ul>
        </Section>

        <Section title="4. Almacenamiento de datos">
          <p>
            Los datos se almacenan en <strong>Firebase</strong> (Google Cloud Platform), con servidores
            ubicados en Europa y Estados Unidos. Google cumple con los estandares de seguridad y
            privacidad aplicables, incluyendo certificaciones SOC 2 e ISO 27001.
          </p>
        </Section>

        <Section title="5. Comparticion de datos con terceros">
          <p>
            <strong>No compartimos tu informacion personal con terceros.</strong> Firebase y Google Cloud
            actuan unicamente como proveedores de infraestructura para el almacenamiento y procesamiento
            de datos. No vendemos, alquilamos ni cedemos datos personales a ninguna otra entidad.
          </p>
        </Section>

        <Section title="6. Derechos del usuario">
          <p>
            Como usuario de BarberFlow, tienes derecho a:
          </p>
          <ul style={{ paddingLeft: 24, marginTop: 8 }}>
            <li>Acceder a tus datos personales almacenados.</li>
            <li>Solicitar la correccion de datos inexactos.</li>
            <li>Solicitar la eliminacion completa de tu cuenta y datos asociados.</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            Para ejercer cualquiera de estos derechos, envía un correo electronico a:{' '}
            <a href="mailto:padilla585.projects@gmail.com" style={{ color: '#C9A84C' }}>
              padilla585.projects@gmail.com
            </a>
          </p>
        </Section>

        <Section title="7. Cookies y tecnologias similares">
          <p>
            El panel de administracion web de BarberFlow utiliza cookies de <strong>Firebase Authentication</strong>{' '}
            para gestionar las sesiones de usuario. Estas cookies son estrictamente necesarias para el
            funcionamiento del sistema de autenticacion y no se utilizan con fines publicitarios.
          </p>
        </Section>

        <Section title="8. Menores de edad">
          <p>
            BarberFlow no esta dirigida a menores de 13 anos. No recopilamos intencionalmente
            informacion de menores de 13 anos. Si descubrimos que hemos recopilado datos de un menor
            sin el consentimiento parental adecuado, eliminaremos dicha informacion de inmediato.
          </p>
        </Section>

        <Section title="9. Actualizaciones de esta politica">
          <p>
            Nos reservamos el derecho de actualizar esta politica de privacidad en cualquier momento.
            Cualquier cambio sera publicado en esta pagina con la fecha de ultima actualizacion
            correspondiente. Te recomendamos revisar esta politica periodicamente.
          </p>
        </Section>

        <Section title="10. Contacto">
          <p>
            Si tienes preguntas o inquietudes sobre esta politica de privacidad, puedes contactarnos en:{' '}
            <a href="mailto:padilla585.projects@gmail.com" style={{ color: '#C9A84C' }}>
              padilla585.projects@gmail.com
            </a>
          </p>
        </Section>

        <div style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: '1px solid #222',
          color: '#555',
          fontSize: 13,
          textAlign: 'center' as const,
        }}>
          BarberFlow &copy; 2026. Todos los derechos reservados.
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{
        color: '#C9A84C',
        fontSize: 20,
        fontWeight: 600,
        marginBottom: 12,
      }}>
        {title}
      </h2>
      <div style={{ color: '#ccc', fontSize: 15 }}>
        {children}
      </div>
    </section>
  )
}
