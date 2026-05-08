import Stripe from "stripe";
import { env, hasStripeConfig } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!hasStripeConfig()) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey);
  }

  return stripeClient;
}

export function constructStripeEvent(
  rawBody: string,
  signature: string,
): Stripe.Event {
  if (!env.stripeWebhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not configured. Set it to verify webhook events.",
    );
  }

  return Stripe.webhooks.constructEvent(
    rawBody,
    signature,
    env.stripeWebhookSecret,
  );
}
