// server/routes/cart.js
import { Router } from "express";
import prisma from "../db.js";
import { authenticated } from "../middleware/auth.js";

const router = Router();

// All cart routes require authentication
router.use(authenticated);

// GET /api/cart - Get user's cart with listing details
router.get("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ error: "Profile setup required" });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: {
        listing: {
          include: {
            seller: {
              select: { id: true, username: true },
            },
          },
        },
      },
      orderBy: { addedAt: "desc" },
    });

    // Filter out items where listing is no longer active
    const validItems = cartItems.filter((item) => item.listing.status === "ACTIVE");
    const invalidItems = cartItems.filter((item) => item.listing.status !== "ACTIVE");

    // Clean up invalid items from cart
    if (invalidItems.length > 0) {
      await prisma.cartItem.deleteMany({
        where: {
          id: { in: invalidItems.map((item) => item.id) },
        },
      });
    }

    res.json({
      items: validItems.map((item) => ({
        id: item.id,
        addedAt: item.addedAt,
        listing: {
          id: item.listing.id,
          cardName: item.listing.cardName,
          setName: item.listing.setName,
          price: item.listing.price,
          imageUrl: item.listing.imageUrl,
          status: item.listing.status,
          seller: item.listing.seller,
        },
      })),
      removedCount: invalidItems.length,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// POST /api/cart - Add listing to cart
router.post("/", async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({ error: "Listing ID is required" });
    }

    if (!req.user) {
      return res.status(403).json({ error: "Profile setup required" });
    }

    // Fetch the listing
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

    // Validation: Cannot add own listing
    if (listing.sellerId === req.user.id) {
      return res.status(400).json({ error: "Cannot add your own listing to cart" });
    }

    // Validation: Cannot add SOLD/CANCELLED listings
    if (listing.status !== "ACTIVE") {
      return res.status(400).json({ error: "This listing is no longer available" });
    }

    // Check if already in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_listingId: {
          userId: req.user.id,
          listingId: listingId,
        },
      },
    });

    if (existingItem) {
      return res.status(400).json({ error: "Item already in cart" });
    }

    // Add to cart
    const cartItem = await prisma.cartItem.create({
      data: {
        userId: req.user.id,
        listingId: listingId,
      },
      include: {
        listing: {
          include: {
            seller: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    console.log(`🛒 Added ${listing.cardName} to cart for user ${req.user.id}`);

    res.status(201).json({
      item: {
        id: cartItem.id,
        addedAt: cartItem.addedAt,
        listing: {
          id: cartItem.listing.id,
          cardName: cartItem.listing.cardName,
          setName: cartItem.listing.setName,
          price: cartItem.listing.price,
          imageUrl: cartItem.listing.imageUrl,
          status: cartItem.listing.status,
          seller: cartItem.listing.seller,
        },
      },
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: "Failed to add item to cart" });
  }
});

// DELETE /api/cart/clear - Clear entire cart
router.delete("/clear", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ error: "Profile setup required" });
    }

    const result = await prisma.cartItem.deleteMany({
      where: { userId: req.user.id },
    });

    console.log(`🛒 Cleared cart for user ${req.user.id} (${result.count} items)`);

    res.json({ message: "Cart cleared", deletedCount: result.count });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

// DELETE /api/cart/:listingId - Remove item from cart
router.delete("/:listingId", async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!req.user) {
      return res.status(403).json({ error: "Profile setup required" });
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: {
        userId_listingId: {
          userId: req.user.id,
          listingId: listingId,
        },
      },
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    await prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    console.log(`🛒 Removed listing ${listingId} from cart for user ${req.user.id}`);

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ error: "Failed to remove item from cart" });
  }
});

export default router;
