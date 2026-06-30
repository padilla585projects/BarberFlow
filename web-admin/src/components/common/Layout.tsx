import { ReactNode, useState } from 'react'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

export default function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className={styles.layout}>
      {/* Mobile hamburger button */}
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {/* Backdrop for mobile sidebar */}
      {mobileOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
