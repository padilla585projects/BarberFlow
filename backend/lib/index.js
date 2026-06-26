"use strict";
// BarberFlow Cloud Functions
// Deploy: npm run deploy (desde /backend)
// Secrets: npx firebase-tools secrets:set RESEND_API_KEY
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAppointmentStatusChanged = exports.onAppointmentCreated = void 0;
var emails_1 = require("./functions/emails");
Object.defineProperty(exports, "onAppointmentCreated", { enumerable: true, get: function () { return emails_1.onAppointmentCreated; } });
Object.defineProperty(exports, "onAppointmentStatusChanged", { enumerable: true, get: function () { return emails_1.onAppointmentStatusChanged; } });
//# sourceMappingURL=index.js.map