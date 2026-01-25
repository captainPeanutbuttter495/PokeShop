// server/routes/webhook.js
import { Router } from "express";
import prisma from "../db.js";
import stripe from "../lib/stripe.js";

const router = Router();

// POST /api/webhook/stripe - Handle Stripe webhook events
router.post("/stripe", async (req, res) => {
  console.log("🔔 Webhook received!");

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log("Signature present:", !!sig);
  console.log("Webhook secret configured:", !!webhookSecret);

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log("✅ Webhook signature verified, event type:", event.type);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      await handleCheckoutComplete(session);
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      await handleCheckoutExpired(session);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

async function handleCheckoutComplete(session) {
  console.log("📦 Processing checkout.session.completed");
  console.log("Session metadata:", session.metadata);

  const { orderId, listingId } = session.metadata;

  if (!orderId || !listingId) {
    console.error("❌ Missing orderId or listingId in session metadata!");
    return;
  }

  console.log(`✅ Payment completed for order: ${orderId}, listing: ${listingId}`);

  try {
    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update order to COMPLETED
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          stripePaymentIntentId: session.payment_intent,
          paidAt: new Date(),
        },
      });

      // Update listing to SOLD
      await tx.cardListing.update({
        where: { id: listingId },
        data: { status: "SOLD" },
      });
    });

    console.log(`📦 Order ${orderId} completed, listing ${listingId} marked as SOLD`);
  } catch (error) {
    console.error("Error processing checkout completion:", error);
    throw error;
  }
}

async function handleCheckoutExpired(session) {
  const { orderId } = session.metadata;

  if (!orderId) return;

  console.log(`⏰ Checkout expired for order: ${orderId}`);

  try {
    // Update order to CANCELLED
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    console.log(`🚫 Order ${orderId} cancelled due to expired checkout`);
  } catch (error) {
    console.error("Error handling checkout expiration:", error);
  }
}

export default router;
