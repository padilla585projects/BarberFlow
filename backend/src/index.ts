// BarberFlow Cloud Functions
// Deploy: npm run deploy (desde /backend)
// Secrets: npx firebase-tools secrets:set RESEND_API_KEY

export { onAppointmentCreated, onAppointmentStatusChanged } from './functions/emails'
export { onAppointmentCreatedPush, onAppointmentStatusChangedPush, onOrderStatusChangedPush } from './functions/push'
export { generateReport, generateBarberReport } from './functions/reports'
export { sendAppointmentReminders } from './functions/reminders'
export { onAppointmentCompletedLoyalty } from './functions/loyalty'
export { onReviewCreatedPush, onProductReviewCreated } from './functions/reviews'
export { sendDailySummary } from './functions/dailySummary'
export { sendWeeklySummary } from './functions/weeklySummary'
export { onMessageCreated } from './functions/messages'
export { processAccountDeletions } from './functions/accountDeletion'
export { onReferralUserCreated } from './functions/referrals'
