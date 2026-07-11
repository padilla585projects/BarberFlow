import { useEffect, useState } from 'react'
import { fixProductImages } from '../services/fixProductImages'

export default function AdminUtilsPage() {
  const [result, setResult] = useState<{ updated: number; errors: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Auto-execute on mount for one-time setup
    handleFixImages()
  }, [])

  const handleFixImages = async () => {
    setLoading(true)
    try {
      const res = await fixProductImages()
      setResult(res)
    } catch (error) {
      console.error('Error:', error)
      setResult({ updated: 0, errors: [`Error: ${error}`] })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', backgroundColor: '#111' }}>
      <h1 style={{ color: '#c9a84c' }}>🛠️ Admin Utilities</h1>

      <div style={{
        maxWidth: '600px',
        margin: '40px auto',
        padding: '30px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #c9a84c'
      }}>
        <h2 style={{ color: '#fff', marginBottom: '20px' }}>Reparar Imágenes de Productos</h2>

        {loading && (
          <p style={{ color: '#c9a84c', fontSize: '18px' }}>⏳ Procesando...</p>
        )}

        {result && !loading && (
          <div style={{ textAlign: 'left', color: '#fff' }}>
            <p style={{ fontSize: '16px', color: '#4ade80' }}>
              ✅ Productos actualizados: <strong>{result.updated}</strong>
            </p>

            {result.errors.length > 0 && (
              <div style={{ marginTop: '20px', color: '#ff6b6b' }}>
                <h3>⚠️ Errores:</h3>
                <ul>
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <p style={{ marginTop: '20px', color: '#999' }}>
              La página se puede cerrar. El problema ha sido arreglado.
            </p>
          </div>
        )}

        {!result && !loading && (
          <button
            onClick={handleFixImages}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#c9a84c',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Reparar Imágenes
          </button>
        )}
      </div>
    </div>
  )
}
