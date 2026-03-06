// /**
//  * utils/email.js — Resend email integration
//  *
//  * MOU Scope: Email notifications for bid events, contract awards, vendor verification.
//  *
//  * All send* functions are fire-and-forget — they log errors but never throw,
//  * so a failed email never blocks the main API response.
//  *
//  * Developer note (Naraway team):
//  *   Set RESEND_API_KEY and SENDER_EMAIL in .env to activate email delivery.
//  *   Without the API key, functions are silently skipped (graceful degradation).
//  *   HTML templates are inline strings — move to a template engine (Handlebars/EJS)
//  *   if email designs become complex.
//  */

// const { Resend } = require('resend');
// const logger     = require('./logger');

// // Lazy-init: only create Resend client if key is configured
// let resend;
// function getResend() {
//   if (!process.env.RESEND_API_KEY) return null;
//   if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
//   return resend;
// }

// const FROM = process.env.SENDER_EMAIL || 'noreply@renergizr.in';

// /**
//  * safeSend — wraps Resend send() with error logging.
//  * Returns true on success, false on failure (never throws).
//  */
// async function safeSend({ to, subject, html }) {
//   const client = getResend();
//   if (!client) {
//     logger.debug(`[email] Skipping "${subject}" to ${to} — RESEND_API_KEY not set`);
//     return false;
//   }
//   try {
//     await client.emails.send({ from: FROM, to, subject, html });
//     logger.info(`[email] Sent "${subject}" to ${to}`);
//     return true;
//   } catch (err) {
//     logger.error(`[email] Failed "${subject}" to ${to}: ${err.message}`);
//     return false;
//   }
// }

// // ─── Email templates ──────────────────────────────────────────────────────────

// const BASE_STYLE = `font-family:Inter,sans-serif;background:#020617;color:#F8FAFC;padding:32px;max-width:600px;margin:auto;`;
// const H2 = `color:#0EA5E9;font-size:20px;margin-bottom:8px;`;
// const P  = `color:#94A3B8;font-size:14px;line-height:1.6;`;
// const BTN = `display:inline-block;background:#0EA5E9;color:#fff;padding:10px 24px;border-radius:4px;text-decoration:none;font-weight:600;margin-top:16px;`;

// /** New bid received — sent to the client who posted the RFQ */
// async function sendNewBid({ clientEmail, rfqTitle, vendorName, price }) {
//   return safeSend({
//     to:      clientEmail,
//     subject: `New bid on "${rfqTitle}" — Renergizr`,
//     html: `<div style="${BASE_STYLE}">
//       <h2 style="${H2}">New Bid Received</h2>
//       <p style="${P}">${vendorName} has submitted a bid of ₹${price}/kWh on your RFQ <strong>${rfqTitle}</strong>.</p>
//       <a href="https://renergizr.in/client/dashboard" style="${BTN}">Review Bids</a>
//     </div>`,
//   });
// }

// /** Contract awarded — sent to the winning vendor */
// async function sendContractAwarded({ vendorEmail, rfqTitle, clientName }) {
//   return safeSend({
//     to:      vendorEmail,
//     subject: `Contract awarded — "${rfqTitle}"`,
//     html: `<div style="${BASE_STYLE}">
//       <h2 style="${H2}">Congratulations! Contract Awarded</h2>
//       <p style="${P}">${clientName} has awarded you the contract for <strong>${rfqTitle}</strong>. Please review and respond within 48 hours.</p>
//       <a href="https://renergizr.in/vendor/contracts" style="${BTN}">View Contract</a>
//     </div>`,
//   });
// }

// /** Vendor accepted contract — sent to client */
// async function sendContractAccepted({ clientEmail, rfqTitle, vendorName }) {
//   return safeSend({
//     to:      clientEmail,
//     subject: `Contract accepted by ${vendorName} — "${rfqTitle}"`,
//     html: `<div style="${BASE_STYLE}">
//       <h2 style="${H2}">Contract Accepted</h2>
//       <p style="${P}">${vendorName} has accepted the contract for <strong>${rfqTitle}</strong>. Your contract is now active.</p>
//       <a href="https://renergizr.in/client/contracts" style="${BTN}">View Contract</a>
//     </div>`,
//   });
// }

// /** Vendor verified by admin — sent to vendor */
// async function sendVendorVerified({ vendorEmail, companyName }) {
//   return safeSend({
//     to:      vendorEmail,
//     subject: `Verification approved — ${companyName}`,
//     html: `<div style="${BASE_STYLE}">
//       <h2 style="${H2}">Verification Approved ✓</h2>
//       <p style="${P}">Your company <strong>${companyName}</strong> has been verified on Renergizr. You can now bid on all open RFQs.</p>
//       <a href="https://renergizr.in/vendor/marketplace" style="${BTN}">Browse RFQs</a>
//     </div>`,
//   });
// }

// module.exports = { sendNewBid, sendContractAwarded, sendContractAccepted, sendVendorVerified };























/**
 * utils/email.js — EMAIL DISABLED VERSION
 *
 * Email sending is temporarily disabled to avoid deployment issues.
 * All functions return success but only log the action.
 *
 * When you want to enable email later:
 * 1. Install resend + react + react-dom
 * 2. Restore the original implementation.
 */

const logger = require('./logger');

/**
 * safeSend — fake email sender
 * Logs instead of sending emails.
 */
async function safeSend({ to, subject }) {
  logger.info(`[email disabled] "${subject}" → ${to}`);
  return true;
}

// ─── Email functions (mocked) ───────────────────────────────────────────────

async function sendNewBid({ clientEmail, rfqTitle, vendorName, price }) {
  return safeSend({
    to: clientEmail,
    subject: `New bid on "${rfqTitle}" — Renergizr`
  });
}

async function sendContractAwarded({ vendorEmail, rfqTitle, clientName }) {
  return safeSend({
    to: vendorEmail,
    subject: `Contract awarded — "${rfqTitle}"`
  });
}

async function sendContractAccepted({ clientEmail, rfqTitle, vendorName }) {
  return safeSend({
    to: clientEmail,
    subject: `Contract accepted by ${vendorName} — "${rfqTitle}"`
  });
}

async function sendVendorVerified({ vendorEmail, companyName }) {
  return safeSend({
    to: vendorEmail,
    subject: `Verification approved — ${companyName}`
  });
}

module.exports = {
  sendNewBid,
  sendContractAwarded,
  sendContractAccepted,
  sendVendorVerified
};