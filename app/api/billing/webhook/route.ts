import { NextResponse } from "next/server";
import Stripe from "stripe";
import { constructStripeEvent } from "@/lib/billing";
import { dbConnect } from "@/lib/mongodb";
import Organization from "@/models/Organization";
import ProcessedWebhook from "@/models/ProcessedWebhook";

function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status,
): string {
  const statusMap: Record<string, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "inactive",
    unpaid: "inactive",
    incomplete: "inactive",
    incomplete_expired: "inactive",
    paused: "inactive",
  };

  return statusMap[stripeStatus] || "inactive";
}

export async function GET() {
  return NextResponse.json({ status: "webhook endpoint active" });
}

export async function POST(request: Request) {
  // Step 1: Read raw body — Stripe signature is computed from the raw payload,
  // so we MUST use text() instead of json().
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  // Step 2: Verify the webhook signature
  let event: Stripe.Event;

  try {
    event = constructStripeEvent(rawBody, signature);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Webhook signature verification failed.",
      },
      { status: 400 },
    );
  }

  // Step 3: Connect to database
  await dbConnect();

  // Step 4: Check for duplicate event — Stripe can deliver the same event multiple times.
  // Using stripeEventId from Stripe's unique event identifier (evt_...).
  // The unique index on stripeEventId in MongoDB prevents race conditions.
  const existingEvent = await ProcessedWebhook.findOne({
    stripeEventId: event.id,
  }).lean();

  if (existingEvent) {
    return NextResponse.json({ received: true });
  }

  // Step 5: Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId =
        session.client_reference_id || session.metadata?.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { message: "Missing organizationId in checkout session." },
          { status: 400 },
        );
      }

      const customerId = session.customer as string | undefined;
      const subscriptionId = session.subscription as string | undefined;

      if (!customerId || !subscriptionId) {
        return NextResponse.json(
          { message: "Checkout session is missing customer or subscription." },
          { status: 400 },
        );
      }

      await Organization.findByIdAndUpdate(organizationId, {
        $set: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          plan: "pro",
          billingStatus: "active",
        },
      });

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;

      await Organization.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        {
          $set: {
            billingStatus: mapSubscriptionStatus(subscription.status),
            plan:
              subscription.status === "canceled" ||
              subscription.status === "unpaid"
                ? "starter"
                : "pro",
          },
        },
      );

      break;
    }

    case "customer.subscription.deleted": {
      const deletedSubscription = event.data.object as Stripe.Subscription;

      await Organization.findOneAndUpdate(
        { stripeSubscriptionId: deletedSubscription.id },
        {
          $set: {
            plan: "starter",
            billingStatus: "inactive",
            stripeSubscriptionId: "",
          },
        },
      );

      break;
    }

    default: {
      // Stripe sends many event types (e.g. payment_intent.*, setup_intent.*).
      // Unhandled events are acknowledged without action.
      break;
    }
  }

  // Step 6: Record the event as processed (fire-and-forget — a write failure
  // should not fail the whole request. The unique index on stripeEventId
  // prevents duplicates on retry even if this write fails once.)
  await ProcessedWebhook.create({ stripeEventId: event.id }).catch(() => {});

  // Step 7: Always acknowledge receipt with 200
  return NextResponse.json({ received: true });
}
