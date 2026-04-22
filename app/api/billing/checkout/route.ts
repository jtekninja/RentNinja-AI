import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env, hasStripeConfig } from "@/lib/env";
import { getStripe } from "@/lib/billing";
import { connectToDatabase } from "@/lib/mongoose";
import Organization from "@/models/Organization";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasStripeConfig()) {
    return NextResponse.json(
      { message: "Stripe is not configured yet. Add your Stripe keys to enable billing." },
      { status: 503 }
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
        price: env.stripeProPriceId,
        quantity: 1
      }
    ],
    success_url: `${env.appUrl}/dashboard?billing=success`,
    cancel_url: `${env.appUrl}/dashboard?billing=cancelled`,
    customer_email: session.user.email ?? undefined,
    client_reference_id: organization.id.toString(),
    metadata: {
      organizationId: organization.id.toString(),
      userId: session.user.id
    }
  });

  return NextResponse.json({ url: checkoutSession.url });
}

