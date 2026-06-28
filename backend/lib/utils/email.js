"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.tplAppointmentConfirmed = tplAppointmentConfirmed;
exports.tplAppointmentCancelled = tplAppointmentCancelled;
exports.tplAppointmentReminder = tplAppointmentReminder;
const resend_1 = require("resend");
// FROM: cambia a tu dominio verificado en Resend cuando lo tengas.
// Mientras tanto usa 'onboarding@resend.dev' para pruebas (solo envía a tu propio email).
// TODO: cambiar a 'BarberFlow <noreply@barberflow.app>' cuando el dominio esté verificado en Resend
const FROM = 'BarberFlow <onboarding@resend.dev>';
// Lazy init: el cliente se crea en tiempo de ejecución (cuando el secret ya está disponible),
// no al analizar el módulo durante el deploy.
let _resend = null;
function getResend() {
    if (!_resend) {
        const key = process.env.RESEND_API_KEY;
        if (!key)
            throw new Error('RESEND_API_KEY secret is not set');
        _resend = new resend_1.Resend(key);
    }
    return _resend;
}
async function sendEmail(to, subject, html) {
    const { error } = await getResend().emails.send({ from: FROM, to, subject, html });
    if (error)
        throw new Error(`Resend error: ${error.message}`);
}
// ─── Templates ────────────────────────────────────────────────────────────────
function tplAppointmentConfirmed(data) {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cita confirmada</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="background:#000;padding:28px 40px;text-align:center">
          <p style="color:#fff;font-size:22px;font-weight:800;letter-spacing:0.1em;margin:0">✂️ BARBERFLOW</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px">
          <p style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px">¡Cita confirmada! ✅</p>
          <p style="color:#666;font-size:15px;margin:0 0 28px">Hola <strong>${data.clientName}</strong>, tu cita está reservada.</p>

          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:10px;padding:0">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;width:40%">Barbería</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111">${data.barbershopName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em">Barbero</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111">${data.barberName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em">Fecha</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111">${data.date}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em">Hora</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111">${data.timeSlot}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em">Servicios</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111">${data.services.join(', ')}</td>
                </tr>
                <tr><td colspan="2" style="padding-top:16px;border-top:1px solid #e8e8e8"></td></tr>
                <tr>
                  <td style="padding:10px 0 0;color:#111;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Total</td>
                  <td style="padding:10px 0 0;font-size:20px;font-weight:800;color:#111">${data.totalPrice.toFixed(2)}€</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:28px 0 0;font-size:13px;color:#999;line-height:1.7">
            Si necesitas cancelar o modificar tu cita, hazlo desde la app de BarberFlow.<br>
            ¡Hasta pronto! ✂️
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="color:#bbb;font-size:12px;margin:0">© ${new Date().getFullYear()} BarberFlow · Gestión de barberías</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
function tplAppointmentCancelled(data) {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Cita cancelada</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:#000;padding:28px 40px;text-align:center">
          <p style="color:#fff;font-size:22px;font-weight:800;letter-spacing:0.1em;margin:0">✂️ BARBERFLOW</p>
        </td></tr>
        <tr><td style="padding:36px 40px">
          <p style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px">Cita cancelada ❌</p>
          <p style="color:#666;font-size:15px;margin:0 0 24px">
            Hola <strong>${data.clientName}</strong>, tu cita del <strong>${data.date}</strong> a las <strong>${data.timeSlot}</strong>
            con <strong>${data.barberName}</strong> en <strong>${data.barbershopName}</strong> ha sido cancelada.
          </p>
          <p style="font-size:14px;color:#999">Puedes reservar una nueva cita cuando quieras desde la app.</p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="color:#bbb;font-size:12px;margin:0">© ${new Date().getFullYear()} BarberFlow</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
function tplAppointmentReminder(data) {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Recordatorio de cita</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:#000;padding:28px 40px;text-align:center">
          <p style="color:#fff;font-size:22px;font-weight:800;letter-spacing:0.1em;margin:0">✂️ BARBERFLOW</p>
        </td></tr>
        <tr><td style="padding:36px 40px">
          <p style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px">¡Te esperamos mañana! 🗓️</p>
          <p style="color:#666;font-size:15px;margin:0 0 24px">
            Hola <strong>${data.clientName}</strong>, te recordamos que mañana tienes cita:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:10px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 8px;font-size:15px;font-weight:700">${data.barbershopName}</p>
              <p style="margin:0;color:#666;font-size:14px">Con <strong>${data.barberName}</strong> · ${data.date} a las <strong>${data.timeSlot}</strong></p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="color:#bbb;font-size:12px;margin:0">© ${new Date().getFullYear()} BarberFlow</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
//# sourceMappingURL=email.js.map