// BarberFlow Cloud Functions
// Deploy: npm run deploy (desde /backend)
// Secrets: npx firebase-tools secrets:set RESEND_API_KEY

export { onAppointmentCreated, onAppointmentStatusChanged } from './functions/emails'
export { onAppointmentCreatedPush, onAppointmentStatusChangedPush } from './functions/push'
export { generateReport } from './functions/reports'
export { sendAppointmentReminders } from './functions/reminders'
export { onAppointmentCompletedLoyalty } from './functions/loyalty'
export { onReviewCreatedPush } from './functions/reviews'
export { sendDailySummary } from './functions/dailySummary'
