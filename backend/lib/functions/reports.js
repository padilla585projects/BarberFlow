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
exports.generateBarberReport = exports.generateReport = void 0;
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
    var _a, _b;
    // ── Auth check ─────────────────────────────────────────────────────
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión para generar reportes.');
    }
    const { barbershopId, period } = request.data;
    if (!barbershopId || !period || !['week', 'month'].includes(period)) {
        throw new https_1.HttpsError('invalid-argument', 'Se requiere barbershopId y period ("week" | "month").');
    }
    // ── Authorization: caller must be the shop owner or a developer ──
    const callerUid = request.auth.uid;
    const userDoc = await db.collection('users').doc(callerUid).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError('permission-denied', 'No tienes permisos para generar este reporte.');
    }
    const userData = userDoc.data();
    const role = userData.role;
    const isDeveloper = role === 'developer';
    const isOwner = role === 'owner' && userData.barbershopId === barbershopId;
    if (!isDeveloper && !isOwner) {
        throw new https_1.HttpsError('permission-denied', 'No tienes permisos para generar este reporte.');
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
    // ── Resolve barber names (batch unique IDs from both collections) ────
    const barberIds = new Set();
    appointmentsSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.barberId)
            barberIds.add(data.barberId);
    });
    salesSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.barberId)
            barberIds.add(data.barberId);
    });
    const barberNameMap = new Map();
    for (const id of barberIds) {
        barberNameMap.set(id, await getBarberName(id));
    }
    const bName = (uid) => { var _a; return (_a = barberNameMap.get(uid)) !== null && _a !== void 0 ? _a : 'Desconocido'; };
    const barberAgg = new Map();
    const ensureBarber = (uid) => {
        if (!barberAgg.has(uid)) {
            barberAgg.set(uid, {
                completedCount: 0, serviceRevenue: 0, productRevenue: 0,
                services: {}, products: {}, avgTicket: 0,
            });
        }
        return barberAgg.get(uid);
    };
    // Aggregate appointments
    appointmentsSnap.docs.forEach((doc) => {
        var _a;
        const d = doc.data();
        if (d.status !== 'completed' || !d.barberId)
            return;
        const agg = ensureBarber(d.barberId);
        agg.completedCount++;
        agg.serviceRevenue += (_a = d.totalPrice) !== null && _a !== void 0 ? _a : 0;
        if (Array.isArray(d.services)) {
            d.services.forEach((s) => {
                var _a;
                if (!agg.services[s.name])
                    agg.services[s.name] = { count: 0, revenue: 0 };
                agg.services[s.name].count++;
                agg.services[s.name].revenue += (_a = s.price) !== null && _a !== void 0 ? _a : 0;
            });
        }
    });
    // Aggregate sales (products)
    salesSnap.docs.forEach((doc) => {
        const d = doc.data();
        if (!d.barberId)
            return;
        const agg = ensureBarber(d.barberId);
        if (Array.isArray(d.items)) {
            d.items.forEach((item) => {
                if (item.type === 'product') {
                    if (!agg.products[item.name])
                        agg.products[item.name] = { count: 0, revenue: 0 };
                    agg.products[item.name].count += item.quantity;
                    agg.products[item.name].revenue += item.price * item.quantity;
                    agg.productRevenue += item.price * item.quantity;
                }
            });
        }
    });
    // Compute avg ticket
    barberAgg.forEach((agg) => {
        agg.avgTicket = agg.completedCount > 0 ? agg.serviceRevenue / agg.completedCount : 0;
    });
    // ── Build workbook ────────────────────────────────────────────────────
    const workbook = new exceljs_1.default.Workbook();
    workbook.creator = 'BarberFlow';
    workbook.created = new Date();
    const addSheetTitle = (ws, text, colCount) => {
        const lastCol = String.fromCharCode(64 + colCount);
        ws.mergeCells(`A1:${lastCol}1`);
        const cell = ws.getCell('A1');
        cell.value = text;
        cell.font = { bold: true, size: 14, color: { argb: 'FFC9A84C' } };
        cell.alignment = { horizontal: 'center' };
        ws.addRow([]);
    };
    const applyZebraRow = (row, idx) => {
        if (idx % 2 === 1) {
            row.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
            });
        }
    };
    const periodLabel = validPeriod === 'week' ? 'Semanal' : 'Mensual';
    // ── Sheet 1: Resumen General ─────────────────────────────────────────
    const ws1 = workbook.addWorksheet('Resumen General');
    addSheetTitle(ws1, `Reporte ${periodLabel}`, 9);
    const h1 = ws1.addRow(['Barbero', 'Citas completadas', 'Canceladas', 'Pendientes',
        'Ingresos servicios (€)', 'Ingresos productos (€)', 'Ingresos total (€)',
        'Ticket medio (€)', 'Servicio top']);
    applyHeaderStyle(h1);
    let idx1 = 0;
    for (const [uid, agg] of barberAgg) {
        const allApps = appointmentsSnap.docs.filter(d => d.data().barberId === uid);
        const cancelled = allApps.filter(d => d.data().status === 'cancelled').length;
        const pending = allApps.filter(d => ['pending', 'confirmed'].includes(d.data().status)).length;
        const topSvc = (_b = (_a = Object.entries(agg.services).sort((a, b) => b[1].count - a[1].count)[0]) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : '—';
        const row = ws1.addRow([
            bName(uid), agg.completedCount, cancelled, pending,
            agg.serviceRevenue, agg.productRevenue,
            agg.serviceRevenue + agg.productRevenue,
            Number(agg.avgTicket.toFixed(2)), topSvc,
        ]);
        row.getCell(5).numFmt = '#,##0.00 "€"';
        row.getCell(6).numFmt = '#,##0.00 "€"';
        row.getCell(7).numFmt = '#,##0.00 "€"';
        row.getCell(8).numFmt = '#,##0.00 "€"';
        applyZebraRow(row, idx1++);
    }
    autoWidthColumns(ws1);
    // ── Sheet 2: Desglose por Barbero ────────────────────────────────────
    const ws2 = workbook.addWorksheet('Desglose por Barbero');
    addSheetTitle(ws2, 'Desglose por Barbero', 8);
    const h2 = ws2.addRow(['Barbero', 'Citas completadas', 'Ingresos servicios (€)',
        'Ingresos productos (€)', 'Ingresos total (€)',
        'Desglose de servicios', 'Ticket medio (€)', 'Productos vendidos']);
    applyHeaderStyle(h2);
    let idx2 = 0;
    for (const [uid, agg] of barberAgg) {
        const svcBreakdown = Object.entries(agg.services)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([name, s]) => `${name}: ${s.count}`)
            .join(', ') || '—';
        const totalProducts = Object.values(agg.products).reduce((s, p) => s + p.count, 0);
        const row = ws2.addRow([
            bName(uid), agg.completedCount, agg.serviceRevenue, agg.productRevenue,
            agg.serviceRevenue + agg.productRevenue, svcBreakdown,
            Number(agg.avgTicket.toFixed(2)), totalProducts,
        ]);
        row.getCell(3).numFmt = '#,##0.00 "€"';
        row.getCell(4).numFmt = '#,##0.00 "€"';
        row.getCell(5).numFmt = '#,##0.00 "€"';
        row.getCell(7).numFmt = '#,##0.00 "€"';
        applyZebraRow(row, idx2++);
    }
    autoWidthColumns(ws2);
    // ── Sheet 3: Servicios por Barbero ───────────────────────────────────
    const ws3 = workbook.addWorksheet('Servicios por Barbero');
    addSheetTitle(ws3, 'Servicios por Barbero', 4);
    const h3 = ws3.addRow(['Barbero', 'Servicio', 'Cantidad', 'Ingresos (€)']);
    applyHeaderStyle(h3);
    let idx3 = 0;
    for (const [uid, agg] of barberAgg) {
        for (const [svcName, svc] of Object.entries(agg.services).sort((a, b) => b[1].count - a[1].count)) {
            const row = ws3.addRow([bName(uid), svcName, svc.count, svc.revenue]);
            row.getCell(4).numFmt = '#,##0.00 "€"';
            applyZebraRow(row, idx3++);
        }
    }
    autoWidthColumns(ws3);
    // ── Sheet 4: Productos Vendidos por Barbero ──────────────────────────
    const ws4 = workbook.addWorksheet('Productos por Barbero');
    addSheetTitle(ws4, 'Productos Vendidos por Barbero', 4);
    const h4 = ws4.addRow(['Barbero', 'Producto', 'Cantidad', 'Ingresos (€)']);
    applyHeaderStyle(h4);
    let idx4 = 0;
    for (const [uid, agg] of barberAgg) {
        for (const [prodName, prod] of Object.entries(agg.products).sort((a, b) => b[1].revenue - a[1].revenue)) {
            const row = ws4.addRow([bName(uid), prodName, prod.count, prod.revenue]);
            row.getCell(4).numFmt = '#,##0.00 "€"';
            applyZebraRow(row, idx4++);
        }
    }
    if (idx4 === 0)
        ws4.addRow(['Sin ventas de productos en este periodo', '', '', '']);
    autoWidthColumns(ws4);
    // ── Sheet 5: Citas Detalladas ────────────────────────────────────────
    const ws5 = workbook.addWorksheet('Citas Detalladas');
    addSheetTitle(ws5, 'Citas Detalladas', 6);
    const h5 = ws5.addRow(['Fecha', 'Barbero', 'Cliente', 'Servicios', 'Total (€)', 'Estado']);
    applyHeaderStyle(h5);
    const statusLabels = {
        pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada',
        cancelled: 'Cancelada', no_show: 'No asistió',
    };
    let idx5 = 0;
    appointmentsSnap.docs.forEach((doc) => {
        var _a, _b, _c, _d, _e;
        const d = doc.data();
        const services = Array.isArray(d.services)
            ? d.services.map((s) => s.name).join(', ')
            : '';
        const row = ws5.addRow([
            fmtDate(d.date),
            bName((_a = d.barberId) !== null && _a !== void 0 ? _a : ''),
            (_b = d.clientName) !== null && _b !== void 0 ? _b : '',
            services,
            (_c = d.totalPrice) !== null && _c !== void 0 ? _c : 0,
            (_e = (_d = statusLabels[d.status]) !== null && _d !== void 0 ? _d : d.status) !== null && _e !== void 0 ? _e : '',
        ]);
        row.getCell(5).numFmt = '#,##0.00 "€"';
        applyZebraRow(row, idx5++);
    });
    autoWidthColumns(ws5);
    // ── Serialize to base64 ───────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const filename = buildFilename(validPeriod);
    return { base64, filename };
});
// ─── Barber-specific Report ──────────────────────────────────────────────────
exports.generateBarberReport = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión para generar reportes.');
    }
    const { barbershopId, period, barberId } = request.data;
    if (!barbershopId || !period || !['week', 'month'].includes(period) || !barberId) {
        throw new https_1.HttpsError('invalid-argument', 'Se requiere barbershopId, barberId y period ("week" | "month").');
    }
    // Authorization: caller must be the barber themselves, the shop owner, or a developer
    const callerUid = request.auth.uid;
    const callerDoc = await db.collection('users').doc(callerUid).get();
    if (!callerDoc.exists) {
        throw new https_1.HttpsError('permission-denied', 'No tienes permisos.');
    }
    const callerData = callerDoc.data();
    const callerRole = callerData.role;
    const isSelf = callerUid === barberId;
    const isDeveloper = callerRole === 'developer';
    const isOwner = callerRole === 'owner' && callerData.barbershopId === barbershopId;
    if (!isSelf && !isDeveloper && !isOwner) {
        throw new https_1.HttpsError('permission-denied', 'No tienes permisos para este reporte.');
    }
    const validPeriod = period;
    const periodStart = getPeriodStart(validPeriod);
    const barberName = await getBarberName(barberId);
    // Fetch appointments for this barber
    const appointmentsSnap = await db
        .collection('appointments')
        .where('barberId', '==', barberId)
        .where('barbershopId', '==', barbershopId)
        .where('date', '>=', admin.firestore.Timestamp.fromDate(periodStart))
        .orderBy('date', 'asc')
        .get();
    // Fetch sales for this barber
    const salesSnap = await db
        .collection('sales')
        .where('barberId', '==', barberId)
        .where('barbershopId', '==', barbershopId)
        .where('date', '>=', admin.firestore.Timestamp.fromDate(periodStart))
        .orderBy('date', 'asc')
        .get();
    const servicesMap = {};
    const productsMap = {};
    let completedCount = 0;
    let cancelledCount = 0;
    let noShowCount = 0;
    let serviceRevenue = 0;
    let productRevenue = 0;
    appointmentsSnap.docs.forEach((doc) => {
        var _a;
        const d = doc.data();
        if (d.status === 'completed') {
            completedCount++;
            serviceRevenue += (_a = d.totalPrice) !== null && _a !== void 0 ? _a : 0;
            if (Array.isArray(d.services)) {
                d.services.forEach((s) => {
                    var _a;
                    if (!servicesMap[s.name])
                        servicesMap[s.name] = { count: 0, revenue: 0 };
                    servicesMap[s.name].count++;
                    servicesMap[s.name].revenue += (_a = s.price) !== null && _a !== void 0 ? _a : 0;
                });
            }
        }
        else if (d.status === 'cancelled') {
            cancelledCount++;
        }
        else if (d.status === 'no_show') {
            noShowCount++;
        }
    });
    salesSnap.docs.forEach((doc) => {
        const d = doc.data();
        if (Array.isArray(d.items)) {
            d.items.forEach((item) => {
                var _a, _b;
                if (item.type === 'product') {
                    const qty = (_a = item.quantity) !== null && _a !== void 0 ? _a : 1;
                    const total = ((_b = item.price) !== null && _b !== void 0 ? _b : 0) * qty;
                    productRevenue += total;
                    if (!productsMap[item.name])
                        productsMap[item.name] = { quantity: 0, revenue: 0 };
                    productsMap[item.name].quantity += qty;
                    productsMap[item.name].revenue += total;
                }
            });
        }
    });
    const totalRevenue = serviceRevenue + productRevenue;
    const avgTicket = completedCount > 0 ? serviceRevenue / completedCount : 0;
    // Build workbook
    const workbook = new exceljs_1.default.Workbook();
    workbook.creator = 'BarberFlow';
    workbook.created = new Date();
    const periodLabel = validPeriod === 'week' ? 'Semanal' : 'Mensual';
    const addSheetTitle = (ws, text, colCount) => {
        const lastCol = String.fromCharCode(64 + colCount);
        ws.mergeCells(`A1:${lastCol}1`);
        const cell = ws.getCell('A1');
        cell.value = text;
        cell.font = { bold: true, size: 14, color: { argb: 'FFC9A84C' } };
        cell.alignment = { horizontal: 'center' };
        ws.addRow([]);
    };
    const applyZebraRow = (row, idx) => {
        if (idx % 2 === 1) {
            row.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
            });
        }
    };
    // ── Sheet 1: Resumen ─────────────────────────────────────────────────
    const ws1 = workbook.addWorksheet('Resumen');
    addSheetTitle(ws1, `Reporte ${periodLabel} — ${barberName}`, 2);
    const summaryData = [
        ['Barbero', barberName],
        ['Periodo', validPeriod === 'week' ? 'Última semana' : 'Último mes'],
        ['', ''],
        ['Total de citas', appointmentsSnap.size],
        ['Completadas', completedCount],
        ['Canceladas', cancelledCount],
        ['No asistió', noShowCount],
        ['', ''],
        ['Ingresos por servicios', `${serviceRevenue.toFixed(2)} €`],
        ['Ingresos por productos', `${productRevenue.toFixed(2)} €`],
        ['Ingresos totales', `${totalRevenue.toFixed(2)} €`],
        ['Ticket medio', `${avgTicket.toFixed(2)} €`],
    ];
    summaryData.forEach(([label, value]) => {
        const row = ws1.addRow([label, value]);
        if (label) {
            row.getCell(1).font = { bold: true };
        }
    });
    autoWidthColumns(ws1);
    // ── Sheet 2: Servicios ───────────────────────────────────────────────
    const ws2 = workbook.addWorksheet('Servicios');
    addSheetTitle(ws2, 'Servicios Realizados', 3);
    const h2 = ws2.addRow(['Servicio', 'Cantidad', 'Ingresos (€)']);
    applyHeaderStyle(h2);
    const sortedServices = Object.entries(servicesMap).sort((a, b) => b[1].count - a[1].count);
    let idx2 = 0;
    sortedServices.forEach(([name, svc]) => {
        const row = ws2.addRow([name, svc.count, svc.revenue]);
        row.getCell(3).numFmt = '#,##0.00 "€"';
        applyZebraRow(row, idx2++);
    });
    if (sortedServices.length === 0) {
        ws2.addRow(['Sin servicios en este periodo', '', '']);
    }
    autoWidthColumns(ws2);
    // ── Sheet 3: Productos ───────────────────────────────────────────────
    const ws3 = workbook.addWorksheet('Productos');
    addSheetTitle(ws3, 'Productos Vendidos', 3);
    const h3 = ws3.addRow(['Producto', 'Cantidad', 'Ingresos (€)']);
    applyHeaderStyle(h3);
    const sortedProducts = Object.entries(productsMap).sort((a, b) => b[1].revenue - a[1].revenue);
    let idx3 = 0;
    sortedProducts.forEach(([name, prod]) => {
        const row = ws3.addRow([name, prod.quantity, prod.revenue]);
        row.getCell(3).numFmt = '#,##0.00 "€"';
        applyZebraRow(row, idx3++);
    });
    if (sortedProducts.length === 0) {
        ws3.addRow(['Sin ventas de productos en este periodo', '', '']);
    }
    autoWidthColumns(ws3);
    // ── Sheet 4: Citas Detalladas ────────────────────────────────────────
    const ws4 = workbook.addWorksheet('Citas Detalladas');
    addSheetTitle(ws4, 'Detalle de Citas', 5);
    const h4 = ws4.addRow(['Fecha', 'Cliente', 'Servicios', 'Total (€)', 'Estado']);
    applyHeaderStyle(h4);
    const statusLabelsBarber = {
        pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada',
        cancelled: 'Cancelada', no_show: 'No asistió',
    };
    let idx4 = 0;
    appointmentsSnap.docs.forEach((doc) => {
        var _a, _b, _c, _d;
        const d = doc.data();
        const services = Array.isArray(d.services)
            ? d.services.map((s) => s.name).join(', ')
            : '';
        const row = ws4.addRow([
            fmtDate(d.date),
            (_a = d.clientName) !== null && _a !== void 0 ? _a : '',
            services,
            (_b = d.totalPrice) !== null && _b !== void 0 ? _b : 0,
            (_d = (_c = statusLabelsBarber[d.status]) !== null && _c !== void 0 ? _c : d.status) !== null && _d !== void 0 ? _d : '',
        ]);
        row.getCell(4).numFmt = '#,##0.00 "€"';
        applyZebraRow(row, idx4++);
    });
    autoWidthColumns(ws4);
    // Serialize
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const today = new Date().toISOString().slice(0, 10);
    const filename = `BarberFlow_MiReporte_${periodLabel}_${today}.xlsx`;
    return { base64, filename };
});
//# sourceMappingURL=reports.js.map