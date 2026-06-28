"use strict";
// BarberFlow Cloud Functions
// Deploy: npm run deploy (desde /backend)
// Secrets: npx firebase-tools secrets:set RESEND_API_KEY
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAppointmentCompletedLoyalty = exports.sendAppointmentReminders = exports.generateReport = exports.onAppointmentStatusChangedPush = exports.onAppointmentCreatedPush = exports.onAppointmentStatusChanged = exports.onAppointmentCreated = void 0;
var emails_1 = require("./functions/emails");
Object.defineProperty(exports, "onAppointmentCreated", { enumerable: true, get: function () { return emails_1.onAppointmentCreated; } });
Object.defineProperty(exports, "onAppointmentStatusChanged", { enumerable: true, get: function () { return emails_1.onAppointmentStatusChanged; } });
var push_1 = require("./functions/push");
Object.defineProperty(exports, "onAppointmentCreatedPush", { enumerable: true, get: function () { return push_1.onAppointmentCreatedPush; } });
Object.defineProperty(exports, "onAppointmentStatusChangedPush", { enumerable: true, get: function () { return push_1.onAppointmentStatusChangedPush; } });
var reports_1 = require("./functions/reports");
Object.defineProperty(exports, "generateReport", { enumerable: true, get: function () { return reports_1.generateReport; } });
var reminders_1 = require("./functions/reminders");
Object.defineProperty(exports, "sendAppointmentReminders", { enumerable: true, get: function () { return reminders_1.sendAppointmentReminders; } });
var loyalty_1 = require("./functions/loyalty");
Object.defineProperty(exports, "onAppointmentCompletedLoyalty", { enumerable: true, get: function () { return loyalty_1.onAppointmentCompletedLoyalty; } });
//# sourceMappingURL=index.js.map