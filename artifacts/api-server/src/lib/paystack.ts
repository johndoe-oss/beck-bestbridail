import { logger } from "./logger";

export interface PaystackInitResult {
  authorizationUrl: string;
  reference: string;
}

export interface PaystackVerifyResult {
  status: "success" | "failed" | "abandoned";
  amount: number; // in smallest currency unit
  currency: string;
}

function paystackHeaders() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function initializePaystackTransaction(params: {
  email: string;
  amount: number; // in kobo/smallest unit (already multiplied by 100)
  reference: string;
  callbackUrl: string;
  currency?: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResult> {
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      callback_url: params.callbackUrl,
      currency: params.currency ?? "NGN",
      metadata: params.metadata ?? {},
    }),
  });

  const data = (await response.json()) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; reference: string };
  };

  if (!data.status || !data.data) {
    logger.error({ data }, "Paystack initialization failed");
    throw new Error(data.message || "Paystack initialization failed");
  }

  return {
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference,
  };
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResult> {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: paystackHeaders() },
  );

  const data = (await response.json()) as {
    status: boolean;
    message: string;
    data?: { status: string; amount: number; currency: string };
  };

  if (!data.status || !data.data) {
    throw new Error(data.message || "Paystack verification failed");
  }

  return {
    status: data.data.status as "success" | "failed" | "abandoned",
    amount: data.data.amount,
    currency: data.data.currency,
  };
}
