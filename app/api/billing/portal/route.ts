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
  const organization = await Organization.findById(session.user.organizationId).lean();

  if (!organization?.stripeCustomerId) {
    return NextResponse.json({ message: "No Stripe customer exists for this account yet." }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ message: "Stripe is unavailable." }, { status: 503 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: organization.stripeCustomerId,
    return_url: `${env.appUrl}/dashboard`
  });

  return NextResponse.json({ url: portalSession.url });
}

