import nodemailer from "nodemailer";
import { logger } from "./logger";

/**
 * Create a reusable SMTP transporter with sensible timeouts.
 * Gmail can be slow from Render, so we use generous timeouts.
 */
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
    connectionTimeout: 30_000,   // 30s to establish TCP connection
    greetingTimeout: 30_000,     // 30s for SMTP greeting
    socketTimeout: 60_000,       // 60s for the full send operation
  });
}

/**
 * Send an email with automatic retries.
 *
 * The function runs in the background (fire-and-forget from route handlers)
 * so the HTTP response is never blocked.  If all retries fail, the error
 * is logged with full detail so you can diagnose SMTP issues in Render logs.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
): Promise<void> {
  const transporter = createTransporter();
  const recipients = Array.isArray(to) ? to.join(",") : to;

  if (!transporter) {
    logger.warn(
      { recipients, subject },
      "Email not sent — SMTP_HOST, SMTP_USER, or SMTP_PASS is not configured. " +
      "Set these environment variables on Render to enable email delivery.",
    );
    return;
  }

  // The From address MUST match the authenticated SMTP_USER or be a verified alias.
  // Gmail SMTP rejects mail where the envelope-from doesn't match the authenticated user.
  // We always use SMTP_USER for the actual address and SMTP_FROM for the friendly name.
  const smtpUser = process.env.SMTP_USER ?? "";
  const fromEnv = process.env.SMTP_FROM ?? "";
  const fromName = fromEnv.includes("<") ? fromEnv.split("<")[0].trim().replace(/^"/, "").replace(/"$/, "") : "Beckbest Bridal";
  const fromAddress = fromEnv.match(/<([^>]+)>/)?.[1] ?? smtpUser;

  // Retry up to 3 times with exponential backoff
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: recipients,
        subject,
        html,
      });

      logger.info(
        { recipients, subject, attempt },
        "Email sent successfully",
      );
      return; // success — exit the function
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_RETRIES) {
        const delayMs = attempt * 5_000; // 5s, then 10s
        logger.warn(
          {
            recipients,
            subject,
            attempt,
            maxRetries: MAX_RETRIES,
            retryDelayMs: delayMs,
            err: lastError.message,
          },
          "Email send attempt failed — will retry",
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted — log the full error details
  logger.error(
    {
      recipients,
      subject,
      maxRetries: MAX_RETRIES,
      err: lastError?.message,
      stack: lastError?.stack,
      code: (lastError as any)?.code,
      command: (lastError as any)?.command,
      response: (lastError as any)?.response,
      responseCode: (lastError as any)?.responseCode,
    },
    "Failed to send email after all retries — check SMTP credentials",
  );
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
