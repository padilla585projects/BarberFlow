"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.tplAppointmentConfirmed = tplAppointmentConfirmed;
exports.tplAppointmentReceived = tplAppointmentReceived;
exports.tplNewAppointmentOwner = tplNewAppointmentOwner;
exports.tplAppointmentCancelled = tplAppointmentCancelled;
exports.tplOrderReceived = tplOrderReceived;
exports.tplNewOrderOwner = tplNewOrderOwner;
exports.tplOrderStatusChanged = tplOrderStatusChanged;
exports.tplAppointmentReminder = tplAppointmentReminder;
const resend_1 = require("resend");
// ── Dominio de email ──────────────────────────────────────────────────────────
// Para activar el dominio propio (barberflow.eu.org):
//   1. Registra en https://nic.eu.org/arf/en/login/ → New domain → barberflow.eu.org
//   2. Delega DNS a Cloudflare (gratis) y añade los registros SPF/DKIM/DMARC que da Resend
//   3. En resend.com/domains verifica el dominio
//   4. Pon RESEND_DOMAIN_VERIFIED = true  ← único cambio necesario
//
// Estado: pendiente aprobación eu.org (~1-4 semanas tras el registro)
// ─────────────────────────────────────────────────────────────────────────────
const RESEND_DOMAIN_VERIFIED = false;
const VERIFIED_FROM = 'BarberFlow <noreply@barberflow.eu.org>';
const FROM = RESEND_DOMAIN_VERIFIED ? VERIFIED_FROM : 'BarberFlow <onboarding@resend.dev>';
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
function tplAppointmentReceived(data) {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cita recibida</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:#000;padding:28px 40px;text-align:center">
          <p style="color:#fff;font-size:22px;font-weight:800;letter-spacing:0.1em;margin:0">BARBERFLOW</p>
        </td></tr>
        <tr><td style="padding:36px 40px">
          <p style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px">Cita recibida</p>
          <p style="color:#666;font-size:15px;margin:0 0 28px">Hola <strong>${data.clientName}</strong>, hemos recibido tu solicitud de cita. Te avisaremos cuando sea confirmada.</p>

          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:10px;padding:0">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;width:40%">Barberia</td>
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
                  <td style="padding:10px 0 0;font-size:20px;font-weight:800;color:#111">${data.totalPrice.toFixed(2)}E</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:28px 0 0;font-size:13px;color:#999;line-height:1.7">
            Recibiras una notificacion cuando tu barbero confirme la cita.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="color:#bbb;font-size:12px;margin:0">BarberFlow</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
function tplNewAppointmentOwner(data) {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nueva cita recibida</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:#000;padding:28px 40px;text-align:center">
          <p style="color:#fff;font-size:22px;font-weight:800;letter-spacing:0.1em;margin:0">BARBERFLOW</p>
        </td></tr>
        <tr><td style="padding:36px 40px">
          <p style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px">Nueva cita recibida</p>
          <p style="color:#666;font-size:15px;margin:0 0 28px">Hola <strong>${data.ownerName}</strong>, se ha reservado una nueva cita en <strong>${data.barbershopName}</strong>.</p>

          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:10px;padding:0">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;width:40%">Cliente</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111">${data.clientName}</td>
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
                  <td style="padding:10px 0 0;font-size:20px;font-weight:800;color:#111">${data.totalPrice.toFixed(2)}E</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:28px 0 0;font-size:13px;color:#999;line-height:1.7">
            Abre la app de BarberFlow para gestionar esta cita.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="color:#bbb;font-size:12px;margin:0">BarberFlow</p>
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
// ─── ORDER TEMPLATES ──────────────────────────────────────────────────────────
function tplOrderReceived(data) {
    const itemRows = data.items.map(i => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#333">${i.name} × ${i.quantity}</td>
      <td style="padding:8px 0;font-size:14px;color:#333;text-align:right">${(i.price * i.quantity).toFixed(2)}€</td>
    </tr>`).join('');
    const shippingBlock = data.shippingAddress
        ? `<tr>
        <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;width:40%">Envío a</td>
        <td style="padding:8px 0;font-size:14px;color:#333">${data.shippingAddress.street}, ${data.shippingAddress.postalCode} ${data.shippingAddress.city}, ${data.shippingAddress.province}</td>
      </tr>`
        : `<tr>
        <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;width:40%">Recogida</td>
        <td style="padding:8px 0;font-size:14px;color:#333">En barbería</td>
      </tr>`;
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pedido recibido</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:#000;padding:28px 40px;text-align:center">
          <p style="color:#fff;font-size:22px;font-weight:800;letter-spacing:0.1em;margin:0">🛍️ BARBERFLOW</p>
        </td></tr>
        <tr><td style="padding:36px 40px">
          <p style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px">¡Pedido recibido! 📦</p>
          <p style="color:#666;font-size:15px;margin:0 0 28px">Hola <strong>${data.clientName}</strong>, hemos recibido tu pedido en <strong>${data.barbershopName}</strong>. Te avisaremos cuando esté en preparación.</p>

          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:10px;margin-bottom:20px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#999">Productos</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${itemRows}
                <tr><td colspan="2" style="padding-top:12px;border-top:1px solid #e8e8e8"></td></tr>
                <tr>
                  <td style="padding:10px 0 0;font-size:14px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:0.06em">Total</td>
                  <td style="padding:10px 0 0;font-size:20px;font-weight:800;color:#111;text-align:right">${data.totalAmount.toFixed(2)}€</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:10px">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${shippingBlock}
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;width:40%">Referencia</td>
                  <td style="padding:8px 0;font-size:12px;color:#666;font-family:monospace">#${data.orderId.slice(-8).toUpperCase()}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:28px 0 0;font-size:13px;color:#999;line-height:1.7">
            Recibirás una notificación cuando el estado de tu pedido cambie.<br>Gracias por tu compra 🙏
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="color:#bbb;font-size:12px;margin:0">© ${new Date().getFullYear()} BarberFlow · Gestión de barberías</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
function tplNewOrderOwner(data) {
    const itemRows = data.items.map(i => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#333">${i.name} × ${i.quantity}</td>
      <td style="padding:8px 0;font-size:14px;color:#333;text-align:right">${(i.price * i.quantity).toFixed(2)}€</td>
    </tr>`).join('');
    const deliveryText = data.shippingAddress
        ? `Envío a: ${data.shippingAddress.street}, ${data.shippingAddress.postalCode} ${data.shippingAddress.city}`
        : 'Recogida en barbería';
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nuevo pedido</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:#000;padding:28px 40px;text-align:center">
          <p style="color:#fff;font-size:22px;font-weight:800;letter-spacing:0.1em;margin:0">🛍️ BARBERFLOW</p>
        </td></tr>
        <tr><td style="padding:36px 40px">
          <p style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px">Nuevo pedido recibido 📦</p>
          <p style="color:#666;font-size:15px;margin:0 0 28px">
            Hola <strong>${data.ownerName}</strong>, <strong>${data.clientName}</strong> ha realizado un pedido en <strong>${data.barbershopName}</strong>.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:10px;margin-bottom:20px">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;width:40%">Cliente</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111">${data.clientName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em">Entrega</td>
                  <td style="padding:8px 0;font-size:14px;color:#333">${deliveryText}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em">Referencia</td>
                  <td style="padding:8px 0;font-size:12px;color:#666;font-family:monospace">#${data.orderId.slice(-8).toUpperCase()}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:10px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#999">Productos</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${itemRows}
                <tr><td colspan="2" style="padding-top:12px;border-top:1px solid #e8e8e8"></td></tr>
                <tr>
                  <td style="padding:10px 0 0;font-size:14px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:0.06em">Total</td>
                  <td style="padding:10px 0 0;font-size:20px;font-weight:800;color:#111;text-align:right">${data.totalAmount.toFixed(2)}€</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:28px 0 0;font-size:13px;color:#999;line-height:1.7">
            Gestiona este pedido desde la app de BarberFlow o el panel web.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="color:#bbb;font-size:12px;margin:0">© ${new Date().getFullYear()} BarberFlow · Gestión de barberías</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
function tplOrderStatusChanged(data) {
    const statusMap = {
        processing: {
            emoji: '🔧',
            title: 'Pedido en preparación',
            body: 'Tu pedido está siendo preparado. Te avisaremos cuando salga para entrega.',
            color: '#3B82F6',
        },
        shipped: {
            emoji: '🚚',
            title: 'Pedido enviado',
            body: 'Tu pedido está en camino. Pronto lo tendrás en tu puerta.',
            color: '#A78BFA',
        },
        delivered: {
            emoji: '✅',
            title: '¡Pedido entregado!',
            body: data.shippingAddress
                ? 'Tu pedido ha sido entregado. Esperamos que disfrutes de tus productos.'
                : 'Tu pedido está listo para recoger en la barbería.',
            color: '#10B981',
        },
        cancelled: {
            emoji: '❌',
            title: 'Pedido cancelado',
            body: 'Tu pedido ha sido cancelado. Si tienes alguna pregunta, contacta con la barbería.',
            color: '#EF4444',
        },
    };
    const s = statusMap[data.status];
    const itemList = data.items.map(i => `${i.name} × ${i.quantity}`).join(', ');
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${s.title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:#000;padding:28px 40px;text-align:center">
          <p style="color:#fff;font-size:22px;font-weight:800;letter-spacing:0.1em;margin:0">🛍️ BARBERFLOW</p>
        </td></tr>
        <tr><td style="padding:36px 40px">
          <p style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px">${s.emoji} ${s.title}</p>
          <p style="color:#666;font-size:15px;margin:0 0 28px">Hola <strong>${data.clientName}</strong>, ${s.body}</p>

          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:10px">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;width:40%">Barbería</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111">${data.barbershopName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em">Productos</td>
                  <td style="padding:8px 0;font-size:14px;color:#333">${itemList}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em">Total</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:700;color:#111">${data.totalAmount.toFixed(2)}€</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em">Referencia</td>
                  <td style="padding:8px 0;font-size:12px;color:#666;font-family:monospace">#${data.orderId.slice(-8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:0.06em">Estado</td>
                  <td style="padding:8px 0">
                    <span style="display:inline-block;background:${s.color};color:#fff;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600">${s.title}</span>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:28px 0 0;font-size:13px;color:#999;line-height:1.7">
            Consulta tus pedidos en cualquier momento desde la app de BarberFlow.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="color:#bbb;font-size:12px;margin:0">© ${new Date().getFullYear()} BarberFlow · Gestión de barberías</p>
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