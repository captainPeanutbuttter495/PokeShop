// server/routes/checkout.js
import { Router } from "express";
import prisma from "../db.js";
import stripe from "../lib/stripe.js";
import { authenticated } from "../middleware/auth.js";

const router = Router();

// Public endpoint - verify checkout session status (no auth required)
router.get("/verify/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const order = await prisma.order.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      include: {
        listing: {
          select: { cardName: true, setName: true, imageUrl: true },
        },
        seller: {
          select: { username: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Return limited info for public endpoint
    res.json({
      status: order.status,
      cardName: order.listing.cardName,
      setName: order.listing.setName,
      imageUrl: order.listing.imageUrl,
      sellerUsername: order.seller.username,
      amount: order.amount,
    });
  } catch (error) {
    console.error("Error verifying checkout:", error);
    res.status(500).json({ error: "Failed to verify checkout" });
  }
});

// All routes below require authentication
router.use(authenticated);

// POST /api/checkout/create-session - Create Stripe Checkout Session
router.post("/create-session", async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({ error: "Listing ID is required" });
    }

    if (!req.user) {
      return res.status(403).json({ error: "Profile setup required to make purchases" });
    }

    // Fetch the listing with seller info
    const listing = await prisma.cardListing.findUnique({
      where: { id: listingId },
      include: {
        seller: {
          select: { id: true, username: true },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Check if listing is still active
    if (listing.status !== "ACTIVE") {
      return res.status(400).json({ error: "This listing is no longer available" });
    }

    // Prevent buyer from purchasing their own listing
    if (listing.sellerId === req.user.id) {
      return res.status(400).json({ error: "You cannot purchase your own listing" });
    }

    // Create pending order
    const order = await prisma.order.create({
      data: {
        buyerId: req.user.id,
        sellerId: listing.sellerId,
        listingId: listing.id,
        amount: listing.price,
        status: "PENDING",
      },
    });

    // Get frontend URL for redirects - use localhost for development
    const frontendUrl = process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL
      : "http://localhost:5173";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: listing.cardName,
              description: `${listing.setName} - Sold by ${listing.seller.username}`,
              images: listing.imageUrl ? [listing.imageUrl] : [],
            },
            unit_amount: Math.round(Number(listing.price) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId: order.id,
        listingId: listing.id,
        buyerId: req.user.id,
        sellerId: listing.sellerId,
      },
      success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/shop/${listing.seller.username}`,
    });

    // Update order with Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    console.log(`💳 Checkout session created for ${listing.cardName} - Order: ${order.id}`);

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ error: error.message || "Failed to create checkout session" });
  }
});

// GET /api/checkout/session/:sessionId - Get session/order status
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // First try to find a single order
    const order = await prisma.order.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      include: {
        listing: true,
        seller: {
          select: { id: true, username: true },
        },
        buyer: {
          select: { id: true, username: true },
        },
      },
    });

    if (order) {
      // Verify the user is the buyer
      if (order.buyerId !== req.user.id) {
        return res.status(403).json({ error: "You do not have access to this order" });
      }
      return res.json({ order });
    }

    // If no single order found, try to find an order group (cart checkout)
    const orderGroup = await prisma.orderGroup.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      include: {
        orderItems: {
          include: {
            listing: true,
            seller: {
              select: { id: true, username: true },
            },
          },
        },
        buyer: {
          select: { id: true, username: true },
        },
      },
    });

    if (!orderGroup) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify the user is the buyer
    if (orderGroup.buyerId !== req.user.id) {
      return res.status(403).json({ error: "You do not have access to this order" });
    }

    res.json({ orderGroup });
  } catch (error) {
    console.error("Error fetching checkout session:", error);
    res.status(500).json({ error: "Failed to fetch order status" });
  }
});

// POST /api/checkout/create-cart-session - Create Stripe Checkout Session for cart
router.post("/create-cart-session", async (req, res) => {
  try {
    const { listingIds } = req.body;

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({ error: "At least one listing ID is required" });
    }

    if (!req.user) {
      return res.status(403).json({ error: "Profile setup required to make purchases" });
    }

    // Fetch all listings with seller info
    const listings = await prisma.cardListing.findMany({
      where: { id: { in: listingIds } },
      include: {
        seller: {
          select: { id: true, username: true },
        },
      },
    });

    // Validate all listings exist
    if (listings.length !== listingIds.length) {
      return res.status(400).json({ error: "One or more listings not found" });
    }

    // Validate all listings are active and not owned by buyer
    const errors = [];
    for (const listing of listings) {
      if (listing.status !== "ACTIVE") {
        errors.push(`"${listing.cardName}" is no longer available`);
      }
      if (listing.sellerId === req.user.id) {
        errors.push(`Cannot purchase your own listing "${listing.cardName}"`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(". ") });
    }

    // Calculate total amount
    const totalAmount = listings.reduce((sum, listing) => sum + Number(listing.price), 0);

    // Create OrderGroup with OrderItems in a transaction
    const orderGroup = await prisma.$transaction(async (tx) => {
      const group = await tx.orderGroup.create({
        data: {
          buyerId: req.user.id,
          totalAmount: totalAmount,
          status: "PENDING",
          orderItems: {
            create: listings.map((listing) => ({
              listingId: listing.id,
              sellerId: listing.sellerId,
              amount: listing.price,
            })),
          },
        },
        include: {
          orderItems: true,
        },
      });
      return group;
    });

    // Get frontend URL for redirects
    const frontendUrl = process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL
      : "http://localhost:5173";

    // Create Stripe Checkout Session with multiple line items
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: listings.map((listing) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: listing.cardName,
            description: `${listing.setName} - Sold by ${listing.seller.username}`,
            images: listing.imageUrl ? [listing.imageUrl] : [],
          },
          unit_amount: Math.round(Number(listing.price) * 100), // Convert to cents
        },
        quantity: 1,
      })),
      metadata: {
        orderGroupId: orderGroup.id,
        buyerId: req.user.id,
        listingIds: JSON.stringify(listingIds),
      },
      success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cart`,
    });

    // Update order group with Stripe session ID
    await prisma.orderGroup.update({
      where: { id: orderGroup.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    console.log(`🛒 Cart checkout session created - OrderGroup: ${orderGroup.id}, Items: ${listings.length}`);

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Error creating cart checkout session:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ error: error.message || "Failed to create checkout session" });
  }
});

export default router;
