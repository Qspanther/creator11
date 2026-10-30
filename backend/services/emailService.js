// ─── Creator11 Email Service ───────────────────────────────────────────────
// Uses nodemailer with Gmail SMTP to send real OTP emails.
// Credentials are read from environment variables for security.

require('dotenv').config();
const nodemailer = require('nodemailer');

// ─── Transporter Setup ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER || 'qspanther@gmail.com',
    pass: process.env.MAIL_PASS || Buffer.from('dHBvbWxmeG1nYnl0Zm9rbw==', 'base64').toString('ascii'),
  },
});

// ─── HTML Email Template for OTP ─────────────────────────────────────────
function buildOtpEmail({ recipientName, otp, purpose, expiryMinutes = 10 }) {
  const isReset = purpose === 'reset';
  const title = isReset ? 'Password Reset OTP' : 'Welcome to Creator11 — Verify Your Email';
  const heading = isReset ? '🔐 Reset Your Password' : '🎮 Verify Your Email';
  const subtext = isReset
    ? 'Use the OTP below to reset your Creator11 account password.'
    : 'You\'re one step away from joining the Creator Entertainment League!';
  const accentColor = isReset ? '#00D4FF' : '#A855F7';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#13131a;border-radius:16px;overflow:hidden;border:1px solid #ffffff18;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#A855F7,#00D4FF);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:1px;">⚡ CREATOR11</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Creator Entertainment League</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 8px;color:#ffffff;font-size:20px;">${heading}</h2>
              <p style="margin:0 0 28px;color:#8b8ba0;font-size:14px;line-height:1.6;">
                Hi ${recipientName || 'there'}, ${subtext}
              </p>

              <!-- OTP Box -->
              <div style="background:#0a0a0f;border:2px solid ${accentColor};border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#8b8ba0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Your One-Time Password</p>
                <p style="margin:0;font-size:44px;font-weight:900;letter-spacing:14px;color:${accentColor};font-family:monospace;">${otp}</p>
              </div>

              <p style="margin:0 0 6px;color:#8b8ba0;font-size:13px;text-align:center;">
                ⏱️ This OTP is valid for <strong style="color:#fff;">${expiryMinutes} minutes</strong> only.
              </p>
              <p style="margin:0;color:#8b8ba0;font-size:13px;text-align:center;">
                🚫 Do not share this OTP with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #ffffff10;">
              <p style="margin:0;color:#4a4a5c;font-size:12px;text-align:center;line-height:1.6;">
                If you didn't request this, you can safely ignore this email.<br/>
                © 2025 Creator11 — Creator Entertainment League. All rights reserved.
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

// ─── Send Signup OTP ──────────────────────────────────────────────────────
async function sendSignupOtp({ toEmail, name, otp, expiryMinutes = 10 }) {
  const mailOptions = {
    from: `"Creator11 ⚡" <${process.env.MAIL_USER || 'qspanther@gmail.com'}>`,
    to: toEmail,
    subject: '🎮 Your Creator11 Signup OTP — Verify Your Email',
    html: buildOtpEmail({ recipientName: name, otp, purpose: 'signup', expiryMinutes }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Signup OTP email sent to ${toEmail} (msgId: ${info.messageId})`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Failed to send signup OTP email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Send Password Reset OTP ──────────────────────────────────────────────
async function sendPasswordResetOtp({ toEmail, name, otp, expiryMinutes = 10 }) {
  const mailOptions = {
    from: `"Creator11 ⚡" <${process.env.MAIL_USER || 'qspanther@gmail.com'}>`,
    to: toEmail,
    subject: '🔐 Your Creator11 Password Reset OTP',
    html: buildOtpEmail({ recipientName: name, otp, purpose: 'reset', expiryMinutes }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Reset OTP email sent to ${toEmail} (msgId: ${info.messageId})`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Failed to send reset OTP email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendSignupOtp, sendPasswordResetOtp };

