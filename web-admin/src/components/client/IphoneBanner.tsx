import { useState, useEffect } from 'react'
import styles from './IphoneBanner.module.css'

export default function IphoneBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const isIphone = /iPhone/.test(navigator.userAgent)
    const isStandalone = (window.navigator as any).standalone === true
    const dismissed = localStorage.getItem('iphoneBannerDismissed') === 'true'

    if (isIphone && !isStandalone && !dismissed) {
      setVisible(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('iphoneBannerDismissed', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={styles.banner}>
      <span className={styles.text}>
        📱 En iPhone: toca <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong> para usar como app
      </span>
      <button className={styles.closeBtn} onClick={handleClose} aria-label="Cerrar">✕</button>
    </div>
  )
}
