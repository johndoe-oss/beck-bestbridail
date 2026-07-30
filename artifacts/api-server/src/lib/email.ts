import { Resend } from "resend";
import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "./logger";

let resendClient: Resend | null = null;
let smtpTransporter: Transporter | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return resendClient ??= new Resend(apiKey);
}

function getSmtpTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return smtpTransporter ??= nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true", auth: { user, pass }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000 });
}

function getFromAddress(): string {
  const configured = process.env.RESEND_FROM ?? process.env.SMTP_FROM;
  if (configured?.includes("<") && configured.includes(">")) return configured;
  return configured ? `Beckbest Bridal <${configured}>` : "Beckbest Bridal <onboarding@resend.dev>";
}

export async function sendEmail(to: string | string[], subject: string, html: string): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to];
  const resend = getResendClient();
  if (resend) {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await resend.emails.send({ from: getFromAddress(), to: recipients, subject, html });
        if (error) throw error;
        logger.info({ recipients, subject, resendId: data?.id }, "Email sent successfully via Resend");
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
    logger.warn({ recipients, subject, err: lastError?.message }, "Resend delivery failed; trying SMTP fallback");
  }
  const smtp = getSmtpTransporter();
  if (smtp) {
    try {
      const info = await smtp.sendMail({ from: process.env.SMTP_FROM ?? getFromAddress(), to: recipients, subject, html });
      logger.info({ recipients, subject, messageId: info.messageId }, "Email sent successfully via SMTP");
      return;
    } catch (err) {
      logger.error({ err, recipients, subject }, "SMTP email delivery failed");
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
  throw new Error("No email provider configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS.");
}

export async function checkEmailConfig(): Promise<boolean> {
  const resend = getResendClient();
  if (!resend && !getSmtpTransporter()) {
    logger.error("No email provider configured - set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS");
    return false;
  }
  if (!resend) { logger.info("SMTP email configuration found"); return true; }
  try {
    const { error } = await resend.domains.list();
    if (error) { logger.error({ err: error.message }, "Resend API key is invalid"); return false; }
    logger.info("Resend configuration verified");
    return true;
  } catch (err) { logger.warn({ err }, "Resend health check failed; sends will still be attempted"); return true; }
}

function codeEmail(title: string, firstName: string, code: string, message: string): string {
  return `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#fdf8f4;padding:48px 40px;border-radius:8px"><h1 style="color:#7c5c3e;font-size:28px">Beckbest Bridal</h1><p style="color:#b89880;font-size:13px;letter-spacing:2px;text-transform:uppercase">${title}</p><p style="color:#4a3020;line-height:1.7">Dear ${firstName},</p><p style="color:#4a3020;line-height:1.7">${message}</p><div style="text-align:center;margin:32px 0;background:#fff;border:1px solid #e8d8c8;border-radius:8px;padding:32px"><span style="font-size:52px;font-weight:700;letter-spacing:14px;color:#7c5c3e;font-family:monospace">${code}</span></div><p style="color:#8a7060;font-size:13px">This code expires in 15 minutes. If you did not request this, please ignore this email.</p></div>`;
}

export function buildVerificationEmail(firstName: string, code: string): string { return codeEmail("Verification Code", firstName, code, "Please enter the code below to verify your email address:"); }
export function buildPasswordResetEmail(firstName: string, code: string): string { return codeEmail("Password Reset", firstName, code, "Please enter the code below to reset your password:"); }
export function buildAdminEmailTemplate(subject: string, body: string): string { return `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#fdf8f4;padding:48px 40px"><h1 style="color:#7c5c3e">Beckbest Bridal</h1><h2 style="color:#4a3020">${subject}</h2><div style="color:#4a3020;line-height:1.8;white-space:pre-wrap">${body}</div></div>`; }
