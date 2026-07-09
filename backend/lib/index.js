"use strict";
// BarberFlow Cloud Functions
// Deploy: npm run deploy (desde /backend)
// Secrets: npx firebase-tools secrets:set RESEND_API_KEY
Object.defineProperty(exports, "__esModule", { value: true });
exports.addBarberToShop = exports.updateUserRole = exports.onProductStockRestored = exports.onReferralUserCreated = exports.processAccountDeletions = exports.onMessageCreated = exports.sendWeeklySummary = exports.sendDailySummary = exports.onProductReviewCreated = exports.onReviewCreatedPush = exports.onAppointmentCompletedLoyalty = exports.sendAppointmentReminders = exports.generateBarberReport = exports.generateReport = exports.onOrderStatusChangedPush = exports.onAppointmentStatusChangedPush = exports.onAppointmentCreatedPush = exports.onAppointmentStatusChanged = exports.onAppointmentCreated = void 0;
var emails_1 = require("./functions/emails");
Object.defineProperty(exports, "onAppointmentCreated", { enumerable: true, get: function () { return emails_1.onAppointmentCreated; } });
Object.defineProperty(exports, "onAppointmentStatusChanged", { enumerable: true, get: function () { return emails_1.onAppointmentStatusChanged; } });
var push_1 = require("./functions/push");
Object.defineProperty(exports, "onAppointmentCreatedPush", { enumerable: true, get: function () { return push_1.onAppointmentCreatedPush; } });
Object.defineProperty(exports, "onAppointmentStatusChangedPush", { enumerable: true, get: function () { return push_1.onAppointmentStatusChangedPush; } });
Object.defineProperty(exports, "onOrderStatusChangedPush", { enumerable: true, get: function () { return push_1.onOrderStatusChangedPush; } });
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
var updateUserRole_1 = require("./functions/updateUserRole");
Object.defineProperty(exports, "updateUserRole", { enumerable: true, get: function () { return updateUserRole_1.updateUserRole; } });
var addBarberToShop_1 = require("./functions/addBarberToShop");
Object.defineProperty(exports, "addBarberToShop", { enumerable: true, get: function () { return addBarberToShop_1.addBarberToShop; } });
//# sourceMappingURL=index.js.map