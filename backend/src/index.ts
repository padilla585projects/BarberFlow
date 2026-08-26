// BarberFlow Cloud Functions
// Deploy: npm run deploy (desde /backend)
// Secrets: npx firebase-tools secrets:set RESEND_API_KEY

export { onAppointmentCreated, onAppointmentStatusChanged, onOrderCreated, onOrderStatusChanged } from './functions/emails'
export { onAppointmentCreatedPush, onAppointmentStatusChangedPush, onOrderStatusChangedPush } from './functions/push'
export { bookAppointment } from './functions/booking'
export { generateReport, generateBarberReport } from './functions/reports'
export { sendAppointmentReminders } from './functions/reminders'
export { onAppointmentCompletedLoyalty } from './functions/loyalty'
export { onReviewCreatedPush, onProductReviewCreated } from './functions/reviews'
export { sendDailySummary } from './functions/dailySummary'
export { sendWeeklySummary } from './functions/weeklySummary'
export { onMessageCreated } from './functions/messages'
export { processAccountDeletions } from './functions/accountDeletion'
export { onReferralUserCreated } from './functions/referrals'
export { onProductStockRestored } from './functions/stockAlerts'
// NO EXPORTAR — updateUserRole, addBarberToShop y fixProductImages son
// funciones onRequest sin ninguna comprobación de autenticación y con
// Access-Control-Allow-Origin: *. Cualquiera que conociera la URL (que sigue un
// formato predecible) podía llamarlas desde el navegador. updateUserRole era la
// peor con diferencia: acepta {uid, role} y escribe con el Admin SDK, saltándose
// las reglas, así que bastaba un POST para autoasignarse el rol 'developer' —
// que firestore.rules acepta como bypass en toda la base de datos.
//
// Ninguna de las tres tenía un solo llamante: el panel y la app hacen esas
// operaciones desde el cliente contra Firestore. Eran restos de scripts de
// migración que se desplegaron como endpoints públicos.
//
// Al no exportarse dejan de desplegarse. Sus ficheros siguen en
// src/functions/ y conviene borrarlos.
export { validatePayPalEmail } from './functions/validatePaymentMethods'
export { createPaymentIntent, stripeWebhook } from './functions/stripePayments'
export { createConnectAccountLink, checkStripeConnectStatus } from './functions/stripeConnect'
