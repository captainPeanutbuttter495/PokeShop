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

  const { orderId, listingId, orderGroupId, buyerId, listingIds } = session.metadata;

  // Handle cart checkout (OrderGroup)
  if (orderGroupId) {
    console.log(`✅ Cart payment completed for orderGroup: ${orderGroupId}`);
    await handleCartCheckoutComplete(session, orderGroupId, buyerId, listingIds);
    return;
  }

  // Handle single item checkout (Order)
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

async function handleCartCheckoutComplete(session, orderGroupId, buyerId, listingIdsJson) {
  try {
    const listingIds = JSON.parse(listingIdsJson);

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update order group to COMPLETED
      await tx.orderGroup.update({
        where: { id: orderGroupId },
        data: {
          status: "COMPLETED",
          stripePaymentIntentId: session.payment_intent,
          paidAt: new Date(),
        },
      });

      // Mark all listings as SOLD
      await tx.cardListing.updateMany({
        where: { id: { in: listingIds } },
        data: { status: "SOLD" },
      });

      // Clear purchased items from user's cart
      if (buyerId) {
        await tx.cartItem.deleteMany({
          where: {
            userId: buyerId,
            listingId: { in: listingIds },
          },
        });
      }
    });

    console.log(`🛒 OrderGroup ${orderGroupId} completed, ${listingIds.length} listings marked as SOLD, cart cleared`);
  } catch (error) {
    console.error("Error processing cart checkout completion:", error);
    throw error;
  }
}

async function handleCheckoutExpired(session) {
  const { orderId, orderGroupId } = session.metadata;

  // Handle cart checkout expiration
  if (orderGroupId) {
    console.log(`⏰ Cart checkout expired for orderGroup: ${orderGroupId}`);
    try {
      await prisma.orderGroup.update({
        where: { id: orderGroupId },
        data: { status: "CANCELLED" },
      });
      console.log(`🚫 OrderGroup ${orderGroupId} cancelled due to expired checkout`);
    } catch (error) {
      console.error("Error handling cart checkout expiration:", error);
    }
    return;
  }

  // Handle single item checkout expiration
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
