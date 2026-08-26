"use strict";
// BarberFlow Cloud Functions
// Deploy: npm run deploy (desde /backend)
// Secrets: npx firebase-tools secrets:set RESEND_API_KEY
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStripeConnectStatus = exports.createConnectAccountLink = exports.stripeWebhook = exports.createPaymentIntent = exports.validatePayPalEmail = exports.onProductStockRestored = exports.onReferralUserCreated = exports.processAccountDeletions = exports.onMessageCreated = exports.sendWeeklySummary = exports.sendDailySummary = exports.onProductReviewCreated = exports.onReviewCreatedPush = exports.onAppointmentCompletedLoyalty = exports.sendAppointmentReminders = exports.generateBarberReport = exports.generateReport = exports.bookAppointment = exports.onOrderStatusChangedPush = exports.onAppointmentStatusChangedPush = exports.onAppointmentCreatedPush = exports.onOrderStatusChanged = exports.onOrderCreated = exports.onAppointmentStatusChanged = exports.onAppointmentCreated = void 0;
var emails_1 = require("./functions/emails");
Object.defineProperty(exports, "onAppointmentCreated", { enumerable: true, get: function () { return emails_1.onAppointmentCreated; } });
Object.defineProperty(exports, "onAppointmentStatusChanged", { enumerable: true, get: function () { return emails_1.onAppointmentStatusChanged; } });
Object.defineProperty(exports, "onOrderCreated", { enumerable: true, get: function () { return emails_1.onOrderCreated; } });
Object.defineProperty(exports, "onOrderStatusChanged", { enumerable: true, get: function () { return emails_1.onOrderStatusChanged; } });
var push_1 = require("./functions/push");
Object.defineProperty(exports, "onAppointmentCreatedPush", { enumerable: true, get: function () { return push_1.onAppointmentCreatedPush; } });
Object.defineProperty(exports, "onAppointmentStatusChangedPush", { enumerable: true, get: function () { return push_1.onAppointmentStatusChangedPush; } });
Object.defineProperty(exports, "onOrderStatusChangedPush", { enumerable: true, get: function () { return push_1.onOrderStatusChangedPush; } });
var booking_1 = require("./functions/booking");
Object.defineProperty(exports, "bookAppointment", { enumerable: true, get: function () { return booking_1.bookAppointment; } });
var reports_1 = require("./functions/reports");
Object.defineProperty(exports, "generateReport", { enumerable: true, get: function () { return reports_1.generateReport; } });
Object.defineProperty(exports, "generateBarberReport", { enumerable: true, get: function () { return reports_1.generateBarberReport; } });
var reminders_1 = require("./functions/reminders");
Object.defineProperty(exports, "sendAppointmentReminders", { enumerable: true, get: function () { return reminders_1.sendAppointmentReminders; } });
var loyalty_1 = require("./functions/loyalty");
Object.defineProperty(exports, "onAppointmentCompletedLoyalty", { enumerable: true, get: function () { return loyalty_1.onAppointmentCompletedLoyalty; } });
var reviews_1 = require("./functions/reviews");
Object.defineProperty(exports, "onReviewCreatedPush", { enumerable: true, get: function () { return reviews_1.onReviewCreatedPush; } });
Object.defineProperty(exports, "onProductReviewCreated", { enumerable: true, get: function () { return reviews_1.onProductReviewCreated; } });
var dailySummary_1 = require("./functions/dailySummary");
Object.defineProperty(exports, "sendDailySummary", { enumerable: true, get: function () { return dailySummary_1.sendDailySummary; } });
var weeklySummary_1 = require("./functions/weeklySummary");
Object.defineProperty(exports, "sendWeeklySummary", { enumerable: true, get: function () { return weeklySummary_1.sendWeeklySummary; } });
var messages_1 = require("./functions/messages");
Object.defineProperty(exports, "onMessageCreated", { enumerable: true, get: function () { return messages_1.onMessageCreated; } });
var accountDeletion_1 = require("./functions/accountDeletion");
Object.defineProperty(exports, "processAccountDeletions", { enumerable: true, get: function () { return accountDeletion_1.processAccountDeletions; } });
var referrals_1 = require("./functions/referrals");
Object.defineProperty(exports, "onReferralUserCreated", { enumerable: true, get: function () { return referrals_1.onReferralUserCreated; } });
var stockAlerts_1 = require("./functions/stockAlerts");
Object.defineProperty(exports, "onProductStockRestored", { enumerable: true, get: function () { return stockAlerts_1.onProductStockRestored; } });
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
var validatePaymentMethods_1 = require("./functions/validatePaymentMethods");
Object.defineProperty(exports, "validatePayPalEmail", { enumerable: true, get: function () { return validatePaymentMethods_1.validatePayPalEmail; } });
var stripePayments_1 = require("./functions/stripePayments");
Object.defineProperty(exports, "createPaymentIntent", { enumerable: true, get: function () { return stripePayments_1.createPaymentIntent; } });
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return stripePayments_1.stripeWebhook; } });
var stripeConnect_1 = require("./functions/stripeConnect");
Object.defineProperty(exports, "createConnectAccountLink", { enumerable: true, get: function () { return stripeConnect_1.createConnectAccountLink; } });
Object.defineProperty(exports, "checkStripeConnectStatus", { enumerable: true, get: function () { return stripeConnect_1.checkStripeConnectStatus; } });
//# sourceMappingURL=index.js.map