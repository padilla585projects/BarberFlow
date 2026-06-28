// BarberFlow Cloud Functions
// Deploy: npm run deploy (desde /backend)
// Secrets: npx firebase-tools secrets:set RESEND_API_KEY

export { onAppointmentCreated, onAppointmentStatusChanged } from './functions/emails'
export { onAppointmentCreatedPush, onAppointmentStatusChangedPush } from './functions/push'
