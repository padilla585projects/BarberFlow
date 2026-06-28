"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReport = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const exceljs_1 = __importDefault(require("exceljs"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REGION = 'europe-west1';
// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPeriodStart(period) {
    const now = new Date();
    const days = period === 'week' ? 7 : 30;
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
function fmtDate(ts) {
    return ts.toDate().toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}
function fmtTime(ts) {
    return ts.toDate().toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit',
    });
}
function buildFilename(period) {
    const today = new Date().toISOString().slice(0, 10);
    const label = period === 'week' ? 'Semanal' : 'Mensual';
    return `BarberFlow_Reporte_${label}_${today}.xlsx`;
}
function applyHeaderStyle(row) {
    row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC9A84C' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
}
function autoWidthColumns(sheet) {
    sheet.columns.forEach((col) => {
        var _a;
        let maxLen = 10;
        (_a = col.eachCell) === null || _a === void 0 ? void 0 : _a.call(col, { includeEmpty: false }, (cell) => {
            const len = cell.value ? String(cell.value).length : 0;
            if (len > maxLen)
                maxLen = len;
        });
        col.width = Math.min(maxLen + 4, 50);
    });
}
async function getBarberName(barberId) {
    var _a, _b;
    const snap = await db.collection('users').doc(barberId).get();
    if (!snap.exists)
        return 'Desconocido';
    const data = snap.data();
    return (_b = (_a = data === null || data === void 0 ? void 0 : data.displayName) !== null && _a !== void 0 ? _a : data === null || data === void 0 ? void 0 : data.name) !== null && _b !== void 0 ? _b : 'Desconocido';
}
// ─── Cloud Function ──────────────────────────────────────────────────────────
exports.generateReport = (0, https_1.onCall)({ region: REGION }, async (request) => {
    const { barbershopId, period } = request.data;
    if (!barbershopId || !period || !['week', 'month'].includes(period)) {
        throw new https_1.HttpsError('invalid-argument', 'Se requiere barbershopId y period ("week" | "month").');
    }
    const validPeriod = period;
    const periodStart = getPeriodStart(validPeriod);
    // ── Fetch appointments ────────────────────────────────────────────────
    const appointmentsSnap = await db
        .collection('appointments')
        .where('barbershopId', '==', barbershopId)
        .where('date', '>=', admin.firestore.Timestamp.fromDate(periodStart))
        .orderBy('date', 'asc')
        .get();
    // ── Fetch sales ───────────────────────────────────────────────────────
    const salesSnap = await db
        .collection('sales')
        .where('barbershopId', '==', barbershopId)
        .where('date', '>=', admin.firestore.Timestamp.fromDate(periodStart))
        .orderBy('date', 'asc')
        .get();
    // ── Resolve barber names for sales (batch unique IDs) ─────────────────
    const barberIds = new Set();
    salesSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.barberId)
            barberIds.add(data.barberId);
    });
    const barberNameMap = new Map();
    for (const id of barberIds) {
        barberNameMap.set(id, await getBarberName(id));
    }
    // ── Build workbook ────────────────────────────────────────────────────
    const workbook = new exceljs_1.default.Workbook();
    // Sheet 1: Citas
    const citasSheet = workbook.addWorksheet('Citas');
    citasSheet.columns = [
        { header: 'Fecha', key: 'fecha' },
        { header: 'Hora', key: 'hora' },
        { header: 'Cliente', key: 'cliente' },
        { header: 'Barbero', key: 'barbero' },
        { header: 'Servicios', key: 'servicios' },
        { header: 'Estado', key: 'estado' },
        { header: 'Total (€)', key: 'total' },
    ];
    appointmentsSnap.docs.forEach((doc) => {
        var _a, _b, _c, _d, _e;
        const d = doc.data();
        const services = Array.isArray(d.services)
            ? d.services.map((s) => s.name).join(', ')
            : '';
        citasSheet.addRow({
            fecha: fmtDate(d.date),
            hora: (_a = d.timeSlot) !== null && _a !== void 0 ? _a : fmtTime(d.date),
            cliente: (_b = d.clientName) !== null && _b !== void 0 ? _b : '',
            barbero: (_c = d.barberName) !== null && _c !== void 0 ? _c : '',
            servicios: services,
            estado: (_d = d.status) !== null && _d !== void 0 ? _d : '',
            total: (_e = d.totalPrice) !== null && _e !== void 0 ? _e : 0,
        });
    });
    applyHeaderStyle(citasSheet.getRow(1));
    autoWidthColumns(citasSheet);
    // Sheet 2: Ventas
    const ventasSheet = workbook.addWorksheet('Ventas');
    ventasSheet.columns = [
        { header: 'Fecha', key: 'fecha' },
        { header: 'Barbero', key: 'barbero' },
        { header: 'Artículos', key: 'articulos' },
        { header: 'Total (€)', key: 'total' },
    ];
    salesSnap.docs.forEach((doc) => {
        var _a, _b;
        const d = doc.data();
        const items = Array.isArray(d.items)
            ? d.items
                .map((i) => `${i.name} x${i.quantity}`)
                .join(', ')
            : '';
        ventasSheet.addRow({
            fecha: fmtDate(d.date),
            barbero: (_a = barberNameMap.get(d.barberId)) !== null && _a !== void 0 ? _a : 'Desconocido',
            articulos: items,
            total: (_b = d.totalAmount) !== null && _b !== void 0 ? _b : 0,
        });
    });
    applyHeaderStyle(ventasSheet.getRow(1));
    autoWidthColumns(ventasSheet);
    // ── Serialize to base64 ───────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const filename = buildFilename(validPeriod);
    return { base64, filename };
});
//# sourceMappingURL=reports.js.map