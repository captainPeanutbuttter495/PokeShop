// server/routes/orders.js
import { Router } from "express";
import prisma from "../db.js";
import { authenticated, requireSeller } from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(authenticated);

// GET /api/orders - Get buyer's order history
router.get("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ error: "Profile setup required" });
    }

    const orders = await prisma.order.findMany({
      where: { buyerId: req.user.id },
      include: {
        listing: true,
        seller: {
          select: { id: true, username: true, favoritePokemon: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/sales - Get seller's sales (requires seller role)
router.get("/sales", requireSeller, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        sellerId: req.user.id,
        status: "COMPLETED",
      },
      include: {
        listing: true,
        buyer: {
          select: { id: true, username: true, favoritePokemon: true },
        },
      },
      orderBy: { paidAt: "desc" },
    });

    res.json({ orders });
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// GET /api/orders/:id - Get specific order
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(403).json({ error: "Profile setup required" });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        listing: true,
        seller: {
          select: { id: true, username: true, favoritePokemon: true },
        },
        buyer: {
          select: { id: true, username: true, favoritePokemon: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify the user is either buyer or seller
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      return res.status(403).json({ error: "You do not have access to this order" });
    }

    res.json({ order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

export default router;
