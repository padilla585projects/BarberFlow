"use strict";
// BarberFlow Cloud Functions
// Deploy: npm run deploy (desde /backend)
// Secrets: npx firebase-tools secrets:set RESEND_API_KEY
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAppointmentStatusChangedPush = exports.onAppointmentCreatedPush = exports.onAppointmentStatusChanged = exports.onAppointmentCreated = void 0;
var emails_1 = require("./functions/emails");
Object.defineProperty(exports, "onAppointmentCreated", { enumerable: true, get: function () { return emails_1.onAppointmentCreated; } });
Object.defineProperty(exports, "onAppointmentStatusChanged", { enumerable: true, get: function () { return emails_1.onAppointmentStatusChanged; } });
var push_1 = require("./functions/push");
Object.defineProperty(exports, "onAppointmentCreatedPush", { enumerable: true, get: function () { return push_1.onAppointmentCreatedPush; } });
Object.defineProperty(exports, "onAppointmentStatusChangedPush", { enumerable: true, get: function () { return push_1.onAppointmentStatusChangedPush; } });
//# sourceMappingURL=index.js.map