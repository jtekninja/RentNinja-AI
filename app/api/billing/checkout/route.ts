import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env, getStripePriceId, hasStripeConfig } from "@/lib/env";
import { getStripe } from "@/lib/billing";
import { connectToDatabase } from "@/lib/mongoose";
import { getPlan, normalizePlan, type PlanKey } from "@/lib/saas-plans";
import Organization from "@/models/Organization";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const requestedPlan = normalizePlan(body?.plan);
  const checkoutPlan: Exclude<PlanKey, "free"> =
    requestedPlan === "free" ? "starter" : requestedPlan;
  const plan = getPlan(checkoutPlan);
  const priceId = getStripePriceId(checkoutPlan);

  if (!hasStripeConfig() || !priceId) {
    return NextResponse.json(
      {
        demoMode: true,
        message: `${plan.name} checkout is in demo mode. Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and ${plan.stripePriceEnv} to enable real Stripe Checkout.`,
      },
      { status: 200 }
    );
  }

  await connectToDatabase();
  const organization = await Organization.findById(session.user.organizationId);
  if (!organization) {
    return NextResponse.json({ message: "Organization not found." }, { status: 404 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ message: "Stripe is unavailable." }, { status: 503 });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: `${env.appUrl}/dashboard?billing=success`,
    cancel_url: `${env.appUrl}/dashboard?billing=cancelled`,
    customer_email: session.user.email ?? undefined,
    client_reference_id: organization.id.toString(),
    metadata: {
      organizationId: organization.id.toString(),
      userId: session.user.id,
      plan: checkoutPlan
    }
  });

  return NextResponse.json({ url: checkoutSession.url });
}
