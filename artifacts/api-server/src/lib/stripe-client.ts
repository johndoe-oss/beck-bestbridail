import Stripe from "stripe";
import { logger } from "./logger";

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    logger.warn("STRIPE_SECRET_KEY not configured — Stripe payments will be unavailable");
    return null;
  }
  _stripe = new Stripe(key, { apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion });
  return _stripe;
}
