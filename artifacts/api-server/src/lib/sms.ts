import { logger } from "./logger";

export async function sendSms(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    logger.info(
      { to, body },
      "SMS not sent (Twilio unconfigured) — configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER",
    );
    return true; // graceful degradation
  }

  try {
    // Dynamic import so missing package doesn't crash server startup
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);
    await client.messages.create({ to, from, body });
    return true;
  } catch (err) {
    logger.error({ err, to }, "Failed to send SMS");
    return false;
  }
}
