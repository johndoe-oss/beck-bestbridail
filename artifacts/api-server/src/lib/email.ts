import { Resend } from "resend";
import { logger } from "./logger";

// ── Resend client (primary email provider) ─────────────────────────────────
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Send an email via Resend (primary) or log a warning if not configured.
 *
 * Resend is an email API service that reliably delivers emails from any
 * hosting environment (including Render) without the IP-reputation issues
 * that plague direct SMTP/Gmail connections from cloud providers.
 *
 * If RESEND_API_KEY is not set, falls back to console logging for development.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to];
  const resend = getResendClient();

  if (!resend) {
    logger.warn(
      { recipients, subject },
      "Email not sent — RESEND_API_KEY is not configured. " +
      "Set RESEND_API_KEY in your Render environment variables to enable email delivery.",
    );
    return;
  }

  const fromAddress = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  const fromName = "Beckbest Bridal";

  // Retry up to 3 times with exponential backoff
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to: recipients,
        subject,
        html,
      });

      if (error) {
        throw error;
      }

      logger.info(
        { recipients, subject, attempt, resendId: data?.id },
        "Email sent successfully via Resend",
      );
      return; // success — exit the function
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_RETRIES) {
        const delayMs = attempt * 3_000; // 3s, then 6s
        logger.warn(
          {
            recipients,
            subject,
            attempt,
            maxRetries: MAX_RETRIES,
            retryDelayMs: delayMs,
            err: lastError.message,
          },
          "Resend email send attempt failed — will retry",
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted — log the full error details
  const errorDetail = {
    recipients,
    subject,
    maxRetries: MAX_RETRIES,
    err: lastError?.message,
    stack: lastError?.stack,
  };
  logger.error(errorDetail, "Failed to send email after all retries via Resend — check RESEND_API_KEY");
  throw lastError ?? new Error("Failed to send email after all retries");
}

/**
 * Test Resend connectivity at server startup.
 * Call this during app initialization to catch misconfiguration early.
 *
 * Uses a simple domain list call to verify the API key is valid.
 * Falls back to checking if the key is configured if the API call fails.
 */
export async function checkEmailConfig(): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    logger.error("Resend not configured — set RESEND_API_KEY in Render environment variables");
    return false;
  }

  try {
    // Simple API call to verify the key is valid
    // Using domains.list() as a lightweight health check
    const { error } = await resend.domains.list();
    if (error) {
      logger.error(
        { err: error.message },
        "Resend API key is invalid — check your RESEND_API_KEY in Render environment variables. Get a valid key at https://resend.com",
      );
      return false;
    }
    logger.info("Resend configuration verified — API key is valid");
    return true;
  } catch (err: any) {
    // If the API call fails but the key is configured, still consider it configured
    // The actual send will surface any real errors
    logger.warn(
      { err: err.message },
      "Resend verification check failed — but will still attempt to send emails. Check your RESEND_API_KEY if emails don't arrive.",
    );
    return true; // Don't block startup — let sendEmail handle errors
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
