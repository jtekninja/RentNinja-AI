const fallbackMongoUri = "mongodb://127.0.0.1:27017/rentninja-ai";

export const env = {
  mongoUri: process.env.MONGODB_URI || fallbackMongoUri,
  mongoDbName: process.env.MONGODB_DB || "rentninja-ai",
  authSecret: process.env.AUTH_SECRET || "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeStarterPriceId: process.env.STRIPE_STARTER_PRICE_ID || "",
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID || "",
  stripeBusinessPriceId: process.env.STRIPE_BUSINESS_PRICE_ID || "",
  stripeEnterprisePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
};

export function validateEnv() {
  if (!env.authSecret) {
    throw new Error(
      "AUTH_SECRET is not set.\n" +
        "  Set it to a long random string to sign authentication tokens.\n" +
        "  Generate one with: openssl rand -base64 32\n" +
        "  Then add it to your .env file: AUTH_SECRET=<your-secret>",
    );
  }

  if (!env.mongoUri) {
    throw new Error(
      "MONGODB_URI is not set.\n" +
        "  Set it to your MongoDB connection string.\n" +
        "  Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db",
    );
  }
}

export function hasStripeConfig() {
  return Boolean(
    env.stripeSecretKey && env.stripeWebhookSecret,
  );
}

export function getStripePriceId(plan: "starter" | "pro" | "business" | "enterprise") {
  const priceIds = {
    starter: env.stripeStarterPriceId,
    pro: env.stripeProPriceId,
    business: env.stripeBusinessPriceId,
    enterprise: env.stripeEnterprisePriceId,
  };

  return priceIds[plan] || "";
}

export function hasMapboxConfig() {
  return Boolean(env.mapboxAccessToken);
}
