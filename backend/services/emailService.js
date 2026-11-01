// ─── Creator11 Email Service ───────────────────────────────────────────────
// Multi-Channel Email Service for Local & Cloud (Render) Deployment:
// 1. Resend HTTPS API (Port 443 — Open on Render) via RESEND_API_KEY
// 2. Google Apps Script Webhook (Port 443 — Open on Render) via GMAIL_WEBHOOK_URL
// 3. Brevo HTTPS API (Port 443 — Open on Render) via BREVO_API_KEY
// 4. Direct Gmail SMTP (Port 465 / 587) for local testing & hosts with open SMTP

require('dotenv').config();
const nodemailer = require('nodemailer');

const mailUser = (process.env.MAIL_USER || 'qspanther@gmail.com').replace(/\s+/g, '').trim().toLowerCase();
const rawPass = process.env.MAIL_PASS || Buffer.from('dHBvbWxmeG1nYnl0Zm9rbw==', 'base64').toString('ascii');
const mailPass = rawPass.replace(/\s+/g, '').trim();

function withTimeout(promise, ms, desc) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout (${ms}ms) while ${desc}`)), ms)
    ),
  ]);
}

// ─── SMTP Transporters (with fast 3000ms timeout to avoid Render freeze) ────
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: mailUser,
    pass: mailPass,
  },
  connectionTimeout: 3000,
  greetingTimeout: 3000,
  socketTimeout: 4000,
  tls: {
    rejectUnauthorized: false,
  },
});

const smtp587Transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS
  requireTLS: true,
  auth: {
    user: mailUser,
    pass: mailPass,
  },
  connectionTimeout: 3000,
  greetingTimeout: 3000,
  socketTimeout: 4000,
  tls: {
    rejectUnauthorized: false,
  },
});

// Non-blocking connection check
gmailTransporter.verify((err) => {
  if (err) {
    console.log('ℹ️ [EmailService] Gmail SMTP notice:', err.message);
  } else {
    console.log('⚡ [EmailService] Gmail SMTP service ready.');
  }
});

// ─── Channel 1: Resend HTTPS (Port 443 — Works 100% on Render) ─────────────
async function tryResend({ toEmail, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await withTimeout(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Creator11 <onboarding@resend.dev>',
          to: [toEmail],
          subject,
          text,
          html,
        }),
      }),
      4000,
      'calling Resend API'
    );
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ [EmailService:Resend-HTTPS] Email delivered to ${toEmail} (ID: ${data.id})`);
      return { success: true, messageId: data.id, provider: 'resend-https' };
    } else {
      console.warn('⚠️ [EmailService:Resend-HTTPS] Notice:', data.message || res.statusText);
    }
  } catch (e) {
    console.warn('⚠️ [EmailService:Resend-HTTPS] Error:', e.message);
  }
  return null;
}

// ─── Channel 2: Google Apps Script Webhook (Port 443 — Works 100% on Render)
async function tryGoogleScript({ toEmail, subject, text, html }) {
  const webhookUrl = process.env.GMAIL_WEBHOOK_URL;
  if (!webhookUrl) return null;

  try {
    const res = await withTimeout(
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toEmail, subject, text, html }),
        redirect: 'follow',
      }),
      5000,
      'calling Google Apps Script webhook'
    );
    if (res.ok) {
      console.log(`✅ [EmailService:GoogleScript-HTTPS] Email delivered to ${toEmail}`);
      return { success: true, provider: 'google-script-https' };
    }
  } catch (e) {
    console.warn('⚠️ [EmailService:GoogleScript-HTTPS] Error:', e.message);
  }
  return null;
}

// ─── Channel 3: Brevo HTTPS API (Port 443 — Works 100% on Render) ──────────
async function tryBrevo({ toEmail, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await withTimeout(
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Creator11', email: mailUser },
          to: [{ email: toEmail }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      }),
      4000,
      'calling Brevo API'
    );
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ [EmailService:Brevo-HTTPS] Email delivered to ${toEmail} (ID: ${data.messageId})`);
      return { success: true, messageId: data.messageId, provider: 'brevo-https' };
    } else {
      console.warn('⚠️ [EmailService:Brevo-HTTPS] Notice:', data.message || res.statusText);
    }
  } catch (e) {
    console.warn('⚠️ [EmailService:Brevo-HTTPS] Error:', e.message);
  }
  return null;
}

// ─── HTML Email Template ───────────────────────────────────────────────────
function buildOtpEmailHtml({ recipientName, otp, purpose, expiryMinutes = 10 }) {
  const isReset = purpose === 'reset';
  const heading = isReset ? 'Reset Your Password' : 'Verify Your Email';
  const subtext = isReset
    ? 'Use the verification code below to reset your Creator11 password.'
    : 'Welcome to Creator11 — Creator Entertainment League! Enter the code below to complete your registration.';
  const accentColor = isReset ? '#00D4FF' : '#A855F7';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#13131a;border-radius:16px;overflow:hidden;border:1px solid #ffffff18;">
          <tr>
            <td style="background:linear-gradient(135deg,#A855F7,#00D4FF);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:2px;">⚡ CREATOR11</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">Creator Entertainment League</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 10px;color:#ffffff;font-size:20px;">${heading}</h2>
              <p style="margin:0 0 24px;color:#a0a0b5;font-size:14px;line-height:1.6;">
                Hi ${recipientName || 'Creator'},<br/>
                ${subtext}
              </p>
              <div style="background:#0a0a0f;border:2px solid ${accentColor};border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#8b8ba0;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Your Verification Code</p>
                <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:12px;color:${accentColor};font-family:Consolas,monaco,monospace;">${otp}</p>
              </div>
              <p style="margin:0 0 8px;color:#a0a0b5;font-size:13px;text-align:center;">
                ⏱️ Valid for <strong>${expiryMinutes} minutes</strong> only.
              </p>
              <p style="margin:0;color:#717182;font-size:12px;text-align:center;">
                If you did not request this code, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #ffffff10;background:#0d0d12;">
              <p style="margin:0;color:#5a5a6e;font-size:12px;text-align:center;line-height:1.6;">
                Need help? Email <a href="mailto:support@creator11.in" style="color:#00D4FF;text-decoration:none;">support@creator11.in</a><br/>
                © 2026 Creator11. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Master Delivery Function ──────────────────────────────────────────────
async function executeSendMail({ toEmail, name, otp, purpose, expiryMinutes = 10 }) {
  const isReset = purpose === 'reset';
  const subject = isReset ? `Creator11 Password Reset Code: ${otp}` : `Your Creator11 Verification Code: ${otp}`;
  const plainText = `Hi ${name || 'Creator'},\n\nYour Creator11 verification code is: ${otp}\n\nValid for ${expiryMinutes} minutes.\n\n— Team Creator11`;
  const html = buildOtpEmailHtml({ recipientName: name, otp, purpose, expiryMinutes });

  console.log(`\n======================================================`);
  console.log(`🔑 [OTP EMAIL SEND] To: ${toEmail} | Code: >>> ${otp} <<<`);
  console.log(`======================================================\n`);

  // 1. Try Resend HTTPS (Port 443 — Works on Render)
  const resend = await tryResend({ toEmail, subject, text: plainText, html });
  if (resend?.success) return resend;

  // 2. Try Google Apps Script Webhook HTTPS (Port 443 — Works on Render)
  const scriptRes = await tryGoogleScript({ toEmail, subject, text: plainText, html });
  if (scriptRes?.success) return scriptRes;

  // 3. Try Brevo HTTPS API (Port 443 — Works on Render)
  const brevoRes = await tryBrevo({ toEmail, subject, text: plainText, html });
  if (brevoRes?.success) return brevoRes;

  const mailOptions = {
    from: `"Creator11" <${mailUser}>`,
    replyTo: mailUser,
    to: toEmail,
    subject,
    text: plainText,
    html,
  };

  // 4. Try Primary 'service: gmail' (Nodemailer native preset, 3500ms max)
  try {
    const info = await withTimeout(
      gmailTransporter.sendMail(mailOptions),
      3500,
      'connecting to Gmail SMTP (Port 465)'
    );
    console.log(`✅ [EmailService:Gmail] Email delivered to ${toEmail} (msgId: ${info.messageId})`);
    return { success: true, messageId: info.messageId, provider: 'service-gmail' };
  } catch (gmailErr) {
    console.warn(`⚠️ [EmailService:Gmail] Notice: ${gmailErr.message}. Trying port 587 fallback...`);

    // 5. Try Fallback Port 587 STARTTLS (3500ms max)
    try {
      const info = await withTimeout(
        smtp587Transporter.sendMail(mailOptions),
        3500,
        'connecting to Gmail SMTP (Port 587)'
      );
      console.log(`✅ [EmailService:SMTP-587] Email delivered to ${toEmail} (msgId: ${info.messageId})`);
      return { success: true, messageId: info.messageId, provider: 'smtp-587' };
    } catch (smtpErr) {
      console.error(`❌ [EmailService] Direct SMTP blocked on this host (Render):`, smtpErr.message);
      return {
        success: false,
        error: `Render host blocks SMTP ports (465/587). To receive emails from Render, add RESEND_API_KEY in Render Environment. (Error: ${smtpErr.message})`,
      };
    }
  }
}

// ─── Exported Methods ──────────────────────────────────────────────────────
async function sendSignupOtp({ toEmail, name, otp, expiryMinutes = 10 }) {
  return await executeSendMail({ toEmail, name, otp, purpose: 'signup', expiryMinutes });
}

async function sendPasswordResetOtp({ toEmail, name, otp, expiryMinutes = 10 }) {
  return await executeSendMail({ toEmail, name, otp, purpose: 'reset', expiryMinutes });
}

module.exports = {
  sendSignupOtp,
  sendPasswordResetOtp,
};
