const fallbackMongoUri = "mongodb://127.0.0.1:27017/rentninja-ai";

export const env = {
  mongoUri: process.env.MONGODB_URI || fallbackMongoUri,
  mongoDbName: process.env.MONGODB_DB || "rentninja-ai",
  authSecret: process.env.AUTH_SECRET || "development-auth-secret-change-me",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID || ""
};

export function hasStripeConfig() {
  return Boolean(env.stripeSecretKey && env.stripeProPriceId);
}

