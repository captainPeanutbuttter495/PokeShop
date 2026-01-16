import { Router } from "express";
import prisma from "../db.js";
import { authenticated, requireAdmin } from "../middleware/auth.js";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticated, requireAdmin);

// GET /api/admin/seller-requests - Get all seller requests
router.get("/seller-requests", async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status: status.toUpperCase() } : {};

    const requests = await prisma.sellerRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            favoritePokemon: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ requests });
  } catch (error) {
    console.error("Error fetching seller requests:", error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// POST /api/admin/seller-requests/:id/approve - Approve a seller request
router.post("/seller-requests/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const sellerRequest = await prisma.sellerRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!sellerRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (sellerRequest.status !== "PENDING") {
      return res.status(400).json({ error: "Request already processed" });
    }

    // Update request and user role in a transaction
    const [updatedRequest] = await prisma.$transaction([
      prisma.sellerRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedById: req.user.id,
          reviewedAt: new Date(),
          reviewNote: reviewNote || null,
        },
      }),
      prisma.user.update({
        where: { id: sellerRequest.userId },
        data: { role: "SELLER" },
      }),
    ]);

    console.log(`✅ Seller approved: ${sellerRequest.user.username} by ${req.user.username}`);
    res.json({ request: updatedRequest });
  } catch (error) {
    console.error("Error approving request:", error);
    res.status(500).json({ error: "Failed to approve request" });
  }
});

// POST /api/admin/seller-requests/:id/reject - Reject a seller request
router.post("/seller-requests/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const sellerRequest = await prisma.sellerRequest.findUnique({ where: { id } });

    if (!sellerRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (sellerRequest.status !== "PENDING") {
      return res.status(400).json({ error: "Request already processed" });
    }

    const updatedRequest = await prisma.sellerRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById: req.user.id,
        reviewedAt: new Date(),
        reviewNote: reviewNote || "Request rejected",
      },
    });

    console.log(`❌ Seller rejected: ${id} by ${req.user.username}`);
    res.json({ request: updatedRequest });
  } catch (error) {
    console.error("Error rejecting request:", error);
    res.status(500).json({ error: "Failed to reject request" });
  }
});

// GET /api/admin/users - Get all users
router.get("/users", async (req, res) => {
  try {
    const { role, active } = req.query;

    const where = {};
    if (role) where.role = role.toUpperCase();
    if (active !== undefined) where.isActive = active === "true";

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        favoritePokemon: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /api/admin/users/:id/deactivate - Deactivate a user
router.post("/users/:id/deactivate", async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: "Cannot deactivate yourself" });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "ADMIN") {
      return res.status(400).json({ error: "Cannot deactivate admin accounts" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    console.log(`🚫 User deactivated: ${user.username} by ${req.user.username}`);
    res.json({ user: updatedUser });
  } catch (error) {
    console.error("Error deactivating user:", error);
    res.status(500).json({ error: "Failed to deactivate user" });
  }
});

// POST /api/admin/users/:id/reactivate - Reactivate a user
router.post("/users/:id/reactivate", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    console.log(`✅ User reactivated: ${user.username} by ${req.user.username}`);
    res.json({ user });
  } catch (error) {
    console.error("Error reactivating user:", error);
    res.status(500).json({ error: "Failed to reactivate user" });
  }
});

// PATCH /api/admin/users/:id/role - Change user role
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["BUYER", "SELLER", "ADMIN"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (id === req.user.id) {
      return res.status(400).json({ error: "Cannot change your own role" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    console.log(`🔄 Role changed: ${user.username} -> ${role} by ${req.user.username}`);
    res.json({ user });
  } catch (error) {
    console.error("Error changing role:", error);
    res.status(500).json({ error: "Failed to change role" });
  }
});

export default router;
