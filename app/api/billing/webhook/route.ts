import { NextResponse } from "next/server";
import Stripe from "stripe";
import { constructStripeEvent } from "@/lib/billing";
import { dbConnect } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { normalizePlan } from "@/lib/saas-plans";
import Organization from "@/models/Organization";
import ProcessedWebhook from "@/models/ProcessedWebhook";

function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status,
): string {
  const statusMap: Record<string, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "unpaid",
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
    logger.warn("Stripe webhook: signature verification failed", {
      error,
    });

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

  logger.info("Stripe webhook: event received", {
    eventType: event.type,
    eventId: event.id,
  });

  // Step 3: Connect to database
  await dbConnect();

  // Step 4: Check for duplicate event
  const existingEvent = await ProcessedWebhook.findOne({
    stripeEventId: event.id,
  }).lean();

  if (existingEvent) {
    logger.info("Stripe webhook: duplicate event skipped", {
      eventId: event.id,
      eventType: event.type,
    });

    return NextResponse.json({ received: true });
  }

  // Step 5: Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId =
        session.client_reference_id || session.metadata?.organizationId;

      if (!organizationId) {
        logger.warn("Stripe webhook: missing organizationId in checkout", {
          eventId: event.id,
          sessionId: session.id,
        });

        return NextResponse.json(
          { message: "Missing organizationId in checkout session." },
          { status: 400 },
        );
      }

      const customerId = session.customer as string | undefined;
      const subscriptionId = session.subscription as string | undefined;

      if (!customerId || !subscriptionId) {
        logger.warn(
          "Stripe webhook: checkout session missing customer or subscription",
          { eventId: event.id, sessionId: session.id },
        );

        return NextResponse.json(
          { message: "Checkout session is missing customer or subscription." },
          { status: 400 },
        );
      }

      await Organization.findByIdAndUpdate(organizationId, {
        $set: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          plan: normalizePlan(session.metadata?.plan || "pro"),
          billingStatus: "active",
        },
      });

      logger.info("Stripe webhook: subscription activated", {
        eventId: event.id,
        organizationId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
      });

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;

      const billingStatus = mapSubscriptionStatus(subscription.status);
      await Organization.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        {
          $set: {
            billingStatus,
          },
        },
      );

      logger.info("Stripe webhook: subscription updated", {
        eventId: event.id,
        stripeSubscriptionId: subscription.id,
        stripeStatus: subscription.status,
        billingStatus,
      });

      break;
    }

    case "customer.subscription.deleted": {
      const deletedSubscription = event.data.object as Stripe.Subscription;

      await Organization.findOneAndUpdate(
        { stripeSubscriptionId: deletedSubscription.id },
        {
          $set: {
          plan: "starter",
          billingStatus: "canceled",
          stripeSubscriptionId: "",
        },
        },
      );

      logger.info("Stripe webhook: subscription cancelled", {
        eventId: event.id,
        stripeSubscriptionId: deletedSubscription.id,
      });

      break;
    }

    default: {
      logger.info("Stripe webhook: unhandled event type", {
        eventId: event.id,
        eventType: event.type,
      });

      break;
    }
  }

  // Step 6: Record the event as processed
  await ProcessedWebhook.create({ stripeEventId: event.id }).catch((error) => {
    logger.warn("Stripe webhook: failed to record processed event", {
      eventId: event.id,
      error,
    });
  });

  // Step 7: Always acknowledge receipt with 200
  logger.info("Stripe webhook: event processed", {
    eventId: event.id,
    eventType: event.type,
  });

  return NextResponse.json({ received: true });
}
