const fallbackMongoUri = "mongodb://127.0.0.1:27017/rentninja-ai";

export const env = {
  mongoUri: process.env.MONGODB_URI || fallbackMongoUri,
  mongoDbName: process.env.MONGODB_DB || "rentninja-ai",
  authSecret: process.env.AUTH_SECRET || "development-auth-secret-change-me",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
};

export function hasStripeConfig() {
  return Boolean(
    env.stripeSecretKey && env.stripeProPriceId && env.stripeWebhookSecret,
  );
}

export function hasMapboxConfig() {
  return Boolean(env.mapboxAccessToken);
}
