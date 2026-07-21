import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
): Promise<boolean> {
  const transporter = createTransporter();
  const recipients = Array.isArray(to) ? to.join(",") : to;

  if (!transporter) {
    logger.info(
      { recipients, subject },
      "Email not sent (SMTP unconfigured) — configure SMTP_HOST, SMTP_USER, SMTP_PASS",
    );
    return true; // graceful degradation
  }

  try {
    await transporter.sendMail({
      from:
        process.env.SMTP_FROM ??
        '"Beckbest Bridal" <noreply@beckbestbridal.com>',
      to: recipients,
      subject,
      html,
    });
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send email");
    return false;
  }
}

export function buildVerificationEmail(
  firstName: string,
  code: string,
): string {
  return `
<div style="font-family:'Georgia',serif;max-width:600px;margin:0 auto;background:#fdf8f4;padding:48px 40px;border-radius:8px;">
  <h1 style="color:#7c5c3e;font-size:28px;margin:0 0 4px;">Beckbest Bridal</h1>
  <p style="color:#b89880;font-size:13px;margin:0 0 32px;letter-spacing:2px;text-transform:uppercase;">Verification Code</p>
  <p style="color:#4a3020;line-height:1.7;">Dear ${firstName},</p>
  <p style="color:#4a3020;line-height:1.7;">Thank you for joining us. Please enter the code below to verify your email address:</p>
  <div style="text-align:center;margin:32px 0;background:#fff;border:1px solid #e8d8c8;border-radius:8px;padding:32px;">
    <span style="font-size:52px;font-weight:700;letter-spacing:14px;color:#7c5c3e;font-family:monospace;">${code}</span>
  </div>
  <p style="color:#8a7060;font-size:13px;">This code expires in 15 minutes. If you did not create an account, please ignore this email.</p>
  <hr style="border:none;border-top:1px solid #e8d8c8;margin:32px 0;" />
  <p style="color:#b89880;font-size:12px;margin:0;">© ${new Date().getFullYear()} Beckbest Bridal. All rights reserved.</p>
</div>`;
}

export function buildAdminEmailTemplate(
  subject: string,
  body: string,
): string {
  return `
<div style="font-family:'Georgia',serif;max-width:600px;margin:0 auto;background:#fdf8f4;padding:48px 40px;border-radius:8px;">
  <h1 style="color:#7c5c3e;font-size:28px;margin:0 0 4px;">Beckbest Bridal</h1>
  <hr style="border:none;border-top:1px solid #e8d8c8;margin:16px 0 32px;" />
  <h2 style="color:#4a3020;font-size:22px;font-weight:600;margin:0 0 16px;">${subject}</h2>
  <div style="color:#4a3020;line-height:1.8;white-space:pre-wrap;">${body}</div>
  <hr style="border:none;border-top:1px solid #e8d8c8;margin:32px 0;" />
  <p style="color:#b89880;font-size:12px;margin:0;">© ${new Date().getFullYear()} Beckbest Bridal. All rights reserved.</p>
</div>`;
}

export function buildPasswordResetEmail(firstName: string, code: string): string {
  return `
<div style="font-family:'Georgia',serif;max-width:600px;margin:0 auto;background:#fdf8f4;padding:48px 40px;border-radius:8px;">
  <h1 style="color:#7c5c3e;font-size:28px;margin:0 0 4px;">Beckbest Bridal</h1>
  <p style="color:#b89880;font-size:13px;margin:0 0 32px;letter-spacing:2px;text-transform:uppercase;">Password Reset</p>
  <p style="color:#4a3020;line-height:1.7;">Dear ${firstName},</p>
  <p style="color:#4a3020;line-height:1.7;">We received a request to reset your password. Please enter the code below to continue:</p>
  <div style="text-align:center;margin:32px 0;background:#fff;border:1px solid #e8d8c8;border-radius:8px;padding:32px;">
    <span style="font-size:52px;font-weight:700;letter-spacing:14px;color:#7c5c3e;font-family:monospace;">${code}</span>
  </div>
  <p style="color:#4a3020;line-height:1.7;">This code expires in 15 minutes. If you did not request a password reset, please ignore this email.</p>
  <hr style="border:none;border-top:1px solid #e8d8c8;margin:32px 0;" />
  <p style="color:#b89880;font-size:12px;margin:0;">© ${new Date().getFullYear()} Beckbest Bridal. All rights reserved.</p>
</div>`;
}
