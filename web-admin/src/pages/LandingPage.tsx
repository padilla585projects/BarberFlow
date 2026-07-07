import { Link } from 'react-router-dom'
import styles from './LandingPage.module.css'

// Play Store: pegar el enlace real cuando se publique
const PLAY_STORE_URL: string | null = null

// Descarga directa APK (mientras no está en Play Store)
const APK_DIRECT_URL: string | null = 'https://github.com/padilla585projects/BarberFlow/releases/download/v1.6.0-beta/BarberFlow-1.6.0.apk'

type PhoneScreen = 'home' | 'booking' | 'history' | 'profile' | 'shop' | 'notifications'
type BrowserView = 'dashboard' | 'agenda' | 'inventory' | 'pos' | 'reports'

const appFeatures = [
  {
    icon: <CalendarIcon />,
    title: 'Reservas en segundos',
    desc: 'Elige barbería, barbero, servicio y horario disponible sin llamadas ni esperas.',
  },
  {
    icon: <StarIcon />,
    title: 'Puntos de fidelización',
    desc: 'Cada visita suma puntos canjeables. Los clientes vuelven, el negocio crece.',
  },
  {
    icon: <BellIcon />,
    title: 'Recordatorios automáticos',
    desc: 'Notificaciones push antes de cada cita. Menos ausencias, más ingresos.',
  },
  {
    icon: <MapPinIcon />,
    title: 'Multi-barbería',
    desc: 'Explora y reserva en cualquier barbería de la red desde una sola cuenta.',
  },
]

const panelFeatures = [
  { title: 'Agenda en tiempo real', desc: 'Cada cita, cada barbero, sincronizado al instante.' },
  { title: 'TPV integrado', desc: 'Cobra servicios y productos sin salir del panel.' },
  { title: 'Inventario con alertas', desc: 'Stock siempre bajo control, avisos antes de agotarse.' },
  { title: 'Reportes exportables', desc: 'Ingresos y ventas en Excel con un clic.' },
  { title: 'Roles y permisos', desc: 'Dueño, barbero y equipo, cada uno con su vista.' },
  { title: 'Multi-local', desc: 'Gestiona varias barberías desde una misma cuenta.' },
]

const appScreens: { screen: PhoneScreen; label: string }[] = [
  { screen: 'home', label: 'Inicio' },
  { screen: 'booking', label: 'Reservar cita' },
  { screen: 'history', label: 'Mis citas' },
  { screen: 'profile', label: 'Perfil y puntos' },
  { screen: 'shop', label: 'Tienda' },
  { screen: 'notifications', label: 'Notificaciones' },
]

const panelScreens: { view: BrowserView; label: string }[] = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'agenda', label: 'Agenda' },
  { view: 'inventory', label: 'Inventario' },
  { view: 'pos', label: 'TPV / Ventas' },
  { view: 'reports', label: 'Reportes' },
]

const statusBadgeClass = {
  ok: styles.mockBadgeOk,
  pending: styles.mockBadgePending,
  done: styles.mockBadgeDone,
} as const

const stockBadgeClass = {
  in: styles.mockBadgeOk,
  low: styles.mockBadgePending,
  out: styles.mockBadgeOut,
} as const

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.brandMark}>
            <img src="/logo.png" alt="BarberFlow" />
            <span>BarberFlow</span>
          </div>
          <nav className={styles.navLinks}>
            <a href="#app">La app</a>
            <a href="#panel">Panel admin</a>
            <a href="#capturas">Capturas</a>
            <a href="#descarga">Descarga</a>
          </nav>
          <Link to="/login" className={styles.navCta}>Acceder al panel</Link>
        </div>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroBg} />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>Plataforma todo-en-uno para barberías</span>
              <h1 className={styles.heroTitle}>
                Gestiona tu<br />
                barbería <span>sin límites</span>
              </h1>
              <p className={styles.heroSub}>
                Reservas online para tus clientes, control total del negocio para ti.
                Citas, barberos, inventario, ventas y reportes en un solo lugar.
              </p>
              <div className={styles.heroActions}>
                <Link to="/login" className={styles.btnPrimary}>Acceder al panel</Link>
                <a href="#descarga" className={styles.btnSecondary}>Descargar la app</a>
              </div>
              <div className={styles.heroStats}>
                <div><strong>100%</strong><span>Control del negocio</span></div>
                <div><strong>24/7</strong><span>Reservas disponibles</span></div>
                <div><strong>∞</strong><span>Barberías gestionables</span></div>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <BrowserMockup className={styles.heroBrowser} compact />
              <PhoneMockup className={styles.heroPhone} screen="booking" />
            </div>
          </div>
        </section>

        {/* ── App móvil ───────────────────────────── */}
        <section id="app" className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionGrid}>
              <div className={styles.sectionVisual}>
                <PhoneMockup screen="home" />
              </div>
              <div className={styles.sectionCopy}>
                <span className={styles.eyebrow}>Para tus clientes</span>
                <h2 className={styles.sectionTitle}>Reservar nunca fue tan fácil</h2>
                <p className={styles.sectionLead}>
                  Tus clientes encuentran barberías cerca, eligen su barbero de confianza
                  y reservan en segundos, directamente desde el móvil.
                </p>
                <ul className={styles.featureList}>
                  {appFeatures.map(f => (
                    <li key={f.title}>
                      <span className={styles.featureIcon}>{f.icon}</span>
                      <div>
                        <strong>{f.title}</strong>
                        <p>{f.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Panel admin ─────────────────────────── */}
        <section id="panel" className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionInner}>
            <div className={`${styles.sectionGrid} ${styles.sectionGridReverse}`}>
              <div className={styles.sectionCopy}>
                <span className={styles.eyebrow}>Para dueños y barberos</span>
                <h2 className={styles.sectionTitle}>El panel que lleva tu negocio</h2>
                <p className={styles.sectionLead}>
                  Un dashboard pensado para decidir rápido: qué vendes, quién trabaja,
                  cuánto ingresas y qué necesita reponerse.
                </p>
                <div className={styles.panelGrid}>
                  {panelFeatures.map(f => (
                    <div key={f.title} className={styles.panelCard}>
                      <strong>{f.title}</strong>
                      <p>{f.desc}</p>
                    </div>
                  ))}
                </div>
                <Link to="/login" className={styles.btnPrimary} style={{ marginTop: 32 }}>
                  Acceder al panel
                </Link>
              </div>
              <div className={styles.sectionVisual}>
                <BrowserMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ── Capturas ─────────────────────────────── */}
        <section id="capturas" className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.capturasHead}>
              <span className={styles.eyebrow}>Más de cerca</span>
              <h2 className={styles.sectionTitle}>Capturas de la plataforma</h2>
              <p className={styles.sectionLead}>
                Un vistazo rápido a las pantallas que usan tus clientes y a las que usa tu equipo cada día.
              </p>
            </div>

            <h3 className={styles.capturasSubtitle}>App móvil</h3>
            <div className={styles.gallery}>
              {appScreens.map(s => (
                <div className={styles.galleryItem} key={s.screen}>
                  <div className={styles.galleryPhoneFrame}>
                    <PhoneMockup screen={s.screen} className={styles.galleryPhone} />
                  </div>
                  <span className={styles.galleryLabel}>{s.label}</span>
                </div>
              ))}
            </div>

            <h3 className={styles.capturasSubtitle}>Panel admin</h3>
            <div className={styles.gallery}>
              {panelScreens.map(s => (
                <div className={styles.galleryItem} key={s.view}>
                  <div className={styles.galleryBrowserFrame}>
                    <BrowserMockup view={s.view} className={styles.galleryBrowser} />
                  </div>
                  <span className={styles.galleryLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Descarga / Play Store ────────────────── */}
        <section id="descarga" className={styles.download}>
          <div className={styles.downloadInner}>
            <span className={styles.eyebrow}>Descarga la app</span>
            <h2 className={styles.sectionTitle}>Llévate BarberFlow contigo</h2>
            <p className={styles.sectionLead}>
              Disponible en Android. Descárgala directamente o espera a la versión oficial en Google Play.
            </p>

            <div className={styles.downloadBtns}>
              {/* Botón Play Store */}
              {PLAY_STORE_URL ? (
                <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className={styles.playBadge}>
                  <PlayStoreIcon />
                  <div>
                    <span>Disponible en</span>
                    <strong>Google Play</strong>
                  </div>
                </a>
              ) : (
                <div className={`${styles.playBadge} ${styles.playBadgeDisabled}`}>
                  <PlayStoreIcon />
                  <div>
                    <span>Muy pronto en</span>
                    <strong>Google Play</strong>
                  </div>
                </div>
              )}

              {/* Botón APK directo */}
              {APK_DIRECT_URL ? (
                <a href={APK_DIRECT_URL} className={styles.apkBadge} download="BarberFlow.apk">
                  <ApkIcon />
                  <div>
                    <span>Descarga directa</span>
                    <strong>APK para Android</strong>
                  </div>
                </a>
              ) : (
                <div className={`${styles.apkBadge} ${styles.apkBadgeDisabled}`}>
                  <ApkIcon />
                  <div>
                    <span>En preparación</span>
                    <strong>APK para Android</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Nota instalación manual — visible cuando hay APK */}
            {APK_DIRECT_URL && (
              <p className={styles.apkNote}>
                ⚠️ Versión beta · Requiere activar <em>«Instalar apps de fuentes desconocidas»</em> en Ajustes de Android
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.brandMark}>
              <img src="/logo.png" alt="BarberFlow" />
              <span>BarberFlow</span>
            </div>
            <p>La plataforma completa para barberías modernas.</p>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/privacy">Política de privacidad</Link>
            <a href="/terms.html">Términos de servicio</a>
            <a href="mailto:padilla585.projects@gmail.com">Contacto</a>
          </div>
          <p className={styles.footerCopy}>
            © {new Date().getFullYear()} BarberFlow. Todos los derechos reservados.
            <span className={styles.footerCredit}>Desarrollado por Adrian Padilla</span>
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   Mockups ilustrados — recrean las pantallas reales sin
   depender de capturas (evita banners de debug / status bar)
   ──────────────────────────────────────────────────────── */

function PhoneMockup({ screen, className }: { screen: PhoneScreen; className?: string }) {
  return (
    <div className={`${styles.phone} ${className ?? ''}`}>
      <div className={styles.phoneNotch} />
      <div className={styles.phoneScreen}>
        {screen === 'home' && <HomeScreen />}
        {screen === 'booking' && <BookingScreen />}
        {screen === 'history' && <HistoryScreen />}
        {screen === 'profile' && <ProfileScreen />}
        {screen === 'shop' && <ShopScreen />}
        {screen === 'notifications' && <NotificationsScreen />}
      </div>
    </div>
  )
}

function HomeScreen() {
  return (
    <div className={styles.mockScreenPad}>
      <div className={styles.mockTopRow}>
        <div className={styles.mockLogoDot}>CC</div>
        <span className={styles.mockAppName}>BarberFlow</span>
        <span className={styles.mockLink}>Mis citas</span>
      </div>
      <h3 className={styles.mockH1}>Barberías cerca</h3>
      <p className={styles.mockMuted}>Elige tu barbería favorita</p>
      <div className={`${styles.mockRow} ${styles.mockRowGold}`}>
        <span className={styles.mockStar}>★</span>
        <div>
          <span className={styles.mockMuted}>Mis puntos</span>
          <strong className={styles.mockGold}>240 pts</strong>
        </div>
        <span className={styles.mockChevron}>›</span>
      </div>
      <div className={styles.mockRow}>
        <div className={styles.mockAvatar}>B</div>
        <div>
          <strong>Barbería Demo</strong>
          <span className={styles.mockMuted}>Calle Mayor 123, Madrid</span>
        </div>
        <span className={styles.mockChevron}>›</span>
      </div>
      <div className={styles.mockRow}>
        <div className={styles.mockAvatar}>E</div>
        <div>
          <strong>Elite Barber Shop</strong>
          <span className={styles.mockMuted}>Avenida del Sol 45, Madrid</span>
        </div>
        <span className={styles.mockChevron}>›</span>
      </div>
    </div>
  )
}

function BookingScreen() {
  return (
    <div className={styles.mockScreenPad}>
      <div className={styles.mockTopRow}>
        <span className={styles.mockBack}>‹</span>
        <span className={styles.mockAppName}>Reservar cita</span>
      </div>
      <p className={styles.mockMuted} style={{ marginTop: 14 }}>ELIGE TU BARBERO</p>
      <div className={styles.mockPillActive}>
        <span className={styles.mockAvatarSm}>M</span> Miguel Barbero
      </div>
      <div className={styles.mockPill}>
        <span className={styles.mockAvatarSm}>A</span> Ana Dueña
      </div>
      <p className={styles.mockMuted} style={{ marginTop: 16 }}>SERVICIOS</p>
      {[
        ['Corte de pelo', '30 min', '15.00 €'],
        ['Barba', '20 min', '10.00 €'],
        ['Corte + Barba', '45 min', '22.00 €'],
      ].map(([name, time, price]) => (
        <div className={styles.mockServiceRow} key={name}>
          <div className={styles.mockCheckbox} />
          <div>
            <strong>{name}</strong>
            <span className={styles.mockMuted}>{time}</span>
          </div>
          <span className={styles.mockGold}>{price}</span>
        </div>
      ))}
    </div>
  )
}

function HistoryScreen() {
  const items: [string, string, string, keyof typeof statusBadgeClass][] = [
    ['Corte + Barba', 'Miguel Barbero · Hoy, 17:30', 'Confirmada', 'ok'],
    ['Corte de pelo', 'Ana Dueña · Vie 10, 12:00', 'Pendiente', 'pending'],
    ['Barba', 'Miguel Barbero · Lun 6, 09:00', 'Completada', 'done'],
  ]
  return (
    <div className={styles.mockScreenPad}>
      <div className={styles.mockTopRow}>
        <span className={styles.mockBack}>‹</span>
        <span className={styles.mockAppName}>Mis citas</span>
      </div>
      <div className={styles.mockTabsRow}>
        <span className={styles.mockTabActive}>Próximas</span>
        <span className={styles.mockTab}>Pasadas</span>
      </div>
      {items.map(([title, sub, status, kind]) => (
        <div className={styles.mockAppointmentRow} key={title}>
          <div>
            <strong>{title}</strong>
            <span className={styles.mockMuted}>{sub}</span>
          </div>
          <span className={`${styles.mockBadge} ${statusBadgeClass[kind]}`}>{status}</span>
        </div>
      ))}
    </div>
  )
}

function ProfileScreen() {
  return (
    <div className={styles.mockScreenPad}>
      <div className={styles.mockTopRow}>
        <span className={styles.mockBack}>‹</span>
        <span className={styles.mockAppName}>Mi perfil</span>
      </div>
      <div className={styles.mockProfileHead}>
        <div className={styles.mockAvatarLg}>C</div>
        <div>
          <strong>Carlos Ruiz</strong>
          <span className={styles.mockMuted}>Cliente desde 2024</span>
        </div>
      </div>
      <div className={`${styles.mockRow} ${styles.mockRowGold}`}>
        <span className={styles.mockStar}>★</span>
        <div>
          <span className={styles.mockMuted}>Nivel Oro</span>
          <strong className={styles.mockGold}>240 pts</strong>
        </div>
      </div>
      <div className={styles.mockProgressTrack}>
        <div className={styles.mockProgressFill} style={{ width: '68%' }} />
      </div>
      <p className={styles.mockMuted} style={{ marginTop: 6 }}>60 pts para el siguiente nivel</p>
      <p className={styles.mockMuted} style={{ marginTop: 18 }}>CUENTA</p>
      {['Editar perfil', 'Métodos de pago', 'Notificaciones', 'Cerrar sesión'].map(label => (
        <div className={styles.mockSettingRow} key={label}>
          <span>{label}</span>
          <span className={styles.mockChevron}>›</span>
        </div>
      ))}
    </div>
  )
}

function ShopScreen() {
  const products: [string, string][] = [
    ['Cera moldeadora', '12.00 €'],
    ['Aceite para barba', '9.00 €'],
    ['Champú anticaída', '14.00 €'],
    ['Kit de afeitado', '25.00 €'],
  ]
  return (
    <div className={styles.mockScreenPad}>
      <div className={styles.mockTopRow}>
        <span className={styles.mockBack}>‹</span>
        <span className={styles.mockAppName}>Tienda</span>
      </div>
      <p className={styles.mockMuted} style={{ marginTop: 14 }}>PRODUCTOS DESTACADOS</p>
      <div className={styles.mockProductGrid}>
        {products.map(([name, price]) => (
          <div className={styles.mockProductCard} key={name}>
            <div className={styles.mockProductImg} />
            <strong>{name}</strong>
            <span className={styles.mockGold}>{price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotificationsScreen() {
  const items: [string, string][] = [
    ['Cita confirmada', 'Tu cita de mañana a las 10:00 ha sido confirmada'],
    ['¡Has ganado puntos!', 'Sumaste 20 puntos por tu última visita'],
    ['Nueva promoción', '20% de descuento en productos esta semana'],
  ]
  return (
    <div className={styles.mockScreenPad}>
      <div className={styles.mockTopRow}>
        <span className={styles.mockBack}>‹</span>
        <span className={styles.mockAppName}>Notificaciones</span>
      </div>
      {items.map(([title, body]) => (
        <div className={styles.mockNotifRow} key={title}>
          <span className={styles.mockNotifDot} />
          <div>
            <strong>{title}</strong>
            <p className={styles.mockMuted}>{body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function BrowserMockup({ className, compact, view = 'dashboard' }: { className?: string; compact?: boolean; view?: BrowserView }) {
  return (
    <div className={`${styles.browser} ${className ?? ''} ${compact ? styles.browserCompact : ''}`}>
      <div className={styles.browserBar}>
        <span /><span /><span />
      </div>
      <div className={styles.browserBody}>
        {view === 'dashboard' && <DashboardView compact={compact} />}
        {view === 'agenda' && <AgendaView />}
        {view === 'inventory' && <InventoryView />}
        {view === 'pos' && <PosView />}
        {view === 'reports' && <ReportsView />}
      </div>
    </div>
  )
}

function DashboardView({ compact }: { compact?: boolean }) {
  return (
    <>
      <div className={styles.dashTop}>
        <strong>Dashboard</strong>
        <span className={styles.mockMuted}>Barbería Demo</span>
      </div>
      <div className={styles.dashStats}>
        <div className={styles.dashStat}>
          <span className={styles.mockMuted}>Ingresos hoy</span>
          <strong className={styles.mockGold}>486 €</strong>
        </div>
        <div className={styles.dashStat}>
          <span className={styles.mockMuted}>Citas hoy</span>
          <strong>18</strong>
        </div>
        <div className={styles.dashStat}>
          <span className={styles.mockMuted}>Barberos activos</span>
          <strong>4</strong>
        </div>
      </div>
      {!compact && (
        <>
          <div className={styles.dashChart}>
            {[38, 62, 45, 80, 55, 95, 70].map((h, i) => (
              <div key={i} className={styles.dashBar} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className={styles.dashTable}>
            {[
              ['Miguel Barbero', 'Corte + Barba', '22.00 €'],
              ['Ana Dueña', 'Lavado + Peinado', '12.00 €'],
              ['Miguel Barbero', 'Corte de pelo', '15.00 €'],
            ].map(([who, what, amount]) => (
              <div className={styles.dashRow} key={who + what}>
                <span>{who}</span>
                <span className={styles.mockMuted}>{what}</span>
                <span className={styles.mockGold}>{amount}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function AgendaView() {
  const slots: [string, string, string, string][] = [
    ['09:00', 'Miguel Barbero', 'Carlos Ruiz', 'Corte + Barba'],
    ['10:30', 'Ana Dueña', 'Luis Gómez', 'Corte de pelo'],
    ['12:00', 'Miguel Barbero', 'David Pérez', 'Barba'],
    ['16:00', 'Ana Dueña', 'Javier Soto', 'Corte + Barba'],
  ]
  return (
    <>
      <div className={styles.dashTop}>
        <strong>Agenda</strong>
        <span className={styles.mockMuted}>Hoy, 4 de julio</span>
      </div>
      <div className={styles.agendaList}>
        {slots.map(([time, barber, client, service]) => (
          <div className={styles.agendaRow} key={time}>
            <span className={styles.agendaTime}>{time}</span>
            <div>
              <strong>{client}</strong>
              <span className={styles.mockMuted}>{service} · {barber}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function InventoryView() {
  const items: [string, string, string, keyof typeof stockBadgeClass][] = [
    ['Cera moldeadora', '32 uds', 'En stock', 'in'],
    ['Aceite para barba', '6 uds', 'Bajo stock', 'low'],
    ['Champú anticaída', '0 uds', 'Agotado', 'out'],
    ['Kit de afeitado', '14 uds', 'En stock', 'in'],
  ]
  return (
    <>
      <div className={styles.dashTop}>
        <strong>Inventario</strong>
        <span className={styles.mockMuted}>Barbería Demo</span>
      </div>
      <div className={styles.dashTable}>
        {items.map(([name, qty, label, kind]) => (
          <div className={styles.dashRow} key={name}>
            <span>{name}</span>
            <span className={styles.mockMuted}>{qty}</span>
            <span className={`${styles.mockBadge} ${stockBadgeClass[kind]}`}>{label}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function PosView() {
  const items: [string, number, string][] = [
    ['Corte + Barba', 1, '22.00 €'],
    ['Cera moldeadora', 1, '12.00 €'],
  ]
  return (
    <>
      <div className={styles.dashTop}>
        <strong>Punto de venta</strong>
        <span className={styles.mockMuted}>Ticket #0042</span>
      </div>
      <div className={styles.posList}>
        {items.map(([name, qty, price]) => (
          <div className={styles.posRow} key={name}>
            <span>{qty}×</span>
            <strong>{name}</strong>
            <span className={styles.mockGold}>{price}</span>
          </div>
        ))}
      </div>
      <div className={styles.posTotalRow}>
        <span>Total</span>
        <strong className={styles.mockGold}>34.00 €</strong>
      </div>
      <div className={styles.posPayBtn}>Cobrar</div>
    </>
  )
}

function ReportsView() {
  return (
    <>
      <div className={styles.dashTop}>
        <strong>Reportes</strong>
        <span className={styles.mockMuted}>Julio 2026</span>
      </div>
      <div className={styles.dashStats}>
        <div className={styles.dashStat}>
          <span className={styles.mockMuted}>Ingresos del mes</span>
          <strong className={styles.mockGold}>9.840 €</strong>
        </div>
        <div className={styles.dashStat}>
          <span className={styles.mockMuted}>Citas completadas</span>
          <strong>312</strong>
        </div>
        <div className={styles.dashStat}>
          <span className={styles.mockMuted}>Ticket medio</span>
          <strong>18,50 €</strong>
        </div>
      </div>
      <div className={styles.dashChart}>
        {[45, 60, 50, 75, 65, 90, 80, 55, 70, 85, 95, 100].map((h, i) => (
          <div key={i} className={styles.dashBar} style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className={styles.dashTable}>
        {[
          ['Corte + Barba', '128 servicios', '2.816 €'],
          ['Corte de pelo', '96 servicios', '1.440 €'],
          ['Cera moldeadora', '54 uds', '648 €'],
        ].map(([name, qty, amount]) => (
          <div className={styles.dashRow} key={name}>
            <span>{name}</span>
            <span className={styles.mockMuted}>{qty}</span>
            <span className={styles.mockGold}>{amount}</span>
          </div>
        ))}
      </div>
    </>
  )
}

/* ── Iconos ── */

function CalendarIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}
function StarIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.1 1.4-6.3-4.8-4.3 6.4-.6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
function BellIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9.5 19a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}
function MapPinIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.7"/></svg>
}
function ApkIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M12 16v-6M9 13l3 3 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PlayStoreIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 512 512">
      <path fill="#00d2ff" d="M99 8.5C91 13 86 21 86 32v448c0 11 5 19 13 23.5l255-247.5z"/>
      <path fill="#00f076" d="M99 8.5l255 247.5-84 82L99 8.5z"/>
      <path fill="#ff3a44" d="M99 503.5l171-166.5 84 82c-3 2.5-7 4.5-11 5.5z"/>
      <path fill="#ffcf00" d="M354 256l-84-82 84-82 65 40c14 9 14 27 0 36z"/>
    </svg>
  )
}
