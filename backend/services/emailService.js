// ─── Creator11 Email Service ───────────────────────────────────────────────
// High-deliverability SMTP service with dual-port failover (587 STARTTLS + 465 SSL),
// multi-part plain text + HTML formatting, and anti-spam optimization.

require('dotenv').config();
const nodemailer = require('nodemailer');

const mailUser = (process.env.MAIL_USER || 'qspanther@gmail.com').trim();
const mailPass = (process.env.MAIL_PASS || Buffer.from('dHBvbWxmeG1nYnl0Zm9rbw==', 'base64').toString('ascii')).trim();

// Transporter 1: Port 587 STARTTLS (Standard for cloud platforms like Render / AWS)
const primaryTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS
  requireTLS: true,
  auth: {
    user: mailUser,
    pass: mailPass,
  },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false,
  },
});

// Transporter 2: Port 465 SSL (Direct secure fallback)
const fallbackTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: mailUser,
    pass: mailPass,
  },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify connection on startup
primaryTransporter.verify((error) => {
  if (error) {
    console.warn('⚠️ [EmailService] Primary SMTP (Port 587) Notice:', error.message);
    fallbackTransporter.verify((fbErr) => {
      if (fbErr) {
        console.error('❌ [EmailService] Both SMTP transporters failed verification:', fbErr.message);
      } else {
        console.log('⚡ [EmailService] Fallback SMTP (Port 465 SSL) active & ready.');
      }
    });
  } else {
    console.log('⚡ [EmailService] Gmail SMTP (Port 587 STARTTLS) active & ready for instant OTP delivery.');
  }
});

// ─── HTML Email Template ───────────────────────────────────────────────────
function buildOtpEmailHtml({ recipientName, otp, purpose, expiryMinutes = 10 }) {
  const isReset = purpose === 'reset';
  const title = isReset ? 'Reset Your Creator11 Password' : 'Verify Your Creator11 Account';
  const heading = isReset ? 'Reset Your Password' : 'Verify Your Email';
  const subtext = isReset
    ? 'Use the verification code below to reset your Creator11 password.'
    : 'Welcome to Creator11 — Creator Entertainment League! Enter the code below to complete your sign up.';
  const accentColor = isReset ? '#00D4FF' : '#A855F7';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#13131a;border-radius:16px;overflow:hidden;border:1px solid #ffffff18;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#A855F7,#00D4FF);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:2px;">⚡ CREATOR11</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;letter-spacing:0.5px;">Creator Entertainment League</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 10px;color:#ffffff;font-size:20px;">${heading}</h2>
              <p style="margin:0 0 24px;color:#a0a0b5;font-size:14px;line-height:1.6;">
                Hi ${recipientName || 'Creator'},<br/>
                ${subtext}
              </p>

              <!-- OTP Code Display Box -->
              <div style="background:#0a0a0f;border:2px solid ${accentColor};border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#8b8ba0;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Your Verification Code</p>
                <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:12px;color:${accentColor};font-family:Consolas,monaco,monospace;">${otp}</p>
              </div>

              <p style="margin:0 0 8px;color:#a0a0b5;font-size:13px;text-align:center;">
                ⏱️ Valid for <strong>${expiryMinutes} minutes</strong> only.
              </p>
              <p style="margin:0;color:#717182;font-size:12px;text-align:center;">
                If you did not request this verification code, please ignore this email or contact support.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #ffffff10;background:#0d0d12;">
              <p style="margin:0;color:#5a5a6e;font-size:12px;text-align:center;line-height:1.6;">
                Need assistance? Email us at <a href="mailto:support@creator11.in" style="color:#00D4FF;text-decoration:none;">support@creator11.in</a><br/>
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

// ─── Dual Failover Send Function ───────────────────────────────────────────
async function executeSend(mailOptions) {
  // Try Primary Transporter (Port 587 STARTTLS)
  try {
    const info = await primaryTransporter.sendMail(mailOptions);
    console.log(`✅ [EmailService:587] Email delivered to ${mailOptions.to} (msgId: ${info.messageId})`);
    return { success: true, messageId: info.messageId, port: 587 };
  } catch (err587) {
    console.warn(`⚠️ [EmailService:587] Failed (${err587.message}). Trying fallback Port 465 SSL...`);
    
    // Try Fallback Transporter (Port 465 SSL)
    try {
      const info = await fallbackTransporter.sendMail(mailOptions);
      console.log(`✅ [EmailService:465] Email delivered to ${mailOptions.to} (msgId: ${info.messageId})`);
      return { success: true, messageId: info.messageId, port: 465 };
    } catch (err465) {
      console.error(`❌ [EmailService] Delivery failed on both ports for ${mailOptions.to}:`, err465.message);
      return { success: false, error: err465.message };
    }
  }
}

// ─── Send Signup OTP ──────────────────────────────────────────────────────
async function sendSignupOtp({ toEmail, name, otp, expiryMinutes = 10 }) {
  console.log(`🔑 [OTP] Generated Signup Code for ${toEmail}: ${otp}`);

  const plainText = `Hi ${name || 'Creator'},\n\nYour Creator11 verification code is: ${otp}\n\nThis code will expire in ${expiryMinutes} minutes.\n\nIf you did not request this code, please ignore this email.\n\n— Team Creator11`;

  const mailOptions = {
    from: `"Creator11" <${mailUser}>`,
    replyTo: mailUser,
    to: toEmail,
    subject: `Your Creator11 Verification Code: ${otp}`,
    text: plainText,
    html: buildOtpEmailHtml({ recipientName: name, otp, purpose: 'signup', expiryMinutes }),
    priority: 'high',
  };

  return await executeSend(mailOptions);
}

// ─── Send Password Reset OTP ──────────────────────────────────────────────
async function sendPasswordResetOtp({ toEmail, name, otp, expiryMinutes = 10 }) {
  console.log(`🔑 [OTP] Generated Password Reset Code for ${toEmail}: ${otp}`);

  const plainText = `Hi ${name || 'Creator'},\n\nYour Creator11 password reset code is: ${otp}\n\nThis code will expire in ${expiryMinutes} minutes.\n\nIf you did not request a password reset, please secure your account immediately.\n\n— Team Creator11`;

  const mailOptions = {
    from: `"Creator11" <${mailUser}>`,
    replyTo: mailUser,
    to: toEmail,
    subject: `Creator11 Password Reset Code: ${otp}`,
    text: plainText,
    html: buildOtpEmailHtml({ recipientName: name, otp, purpose: 'reset', expiryMinutes }),
    priority: 'high',
  };

  return await executeSend(mailOptions);
}

module.exports = { sendSignupOtp, sendPasswordResetOtp };
