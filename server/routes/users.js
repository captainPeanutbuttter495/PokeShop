// server/routes/users.js
import { Router } from "express";
import prisma from "../db.js";
import { authenticated } from "../middleware/auth.js";

const router = Router();

// GET /api/users/profile - Get current user's profile
router.get("/profile", authenticated, async (req, res) => {
  try {
    if (req.user) {
      return res.json({
        user: req.user,
        profileComplete: Boolean(req.user.username),
      });
    }

    res.json({
      user: null,
      profileComplete: false,
      auth: { auth0Id: req.auth.sub },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// POST /api/users/profile - Create profile (first-time setup)
router.post("/profile", authenticated, async (req, res) => {
  try {
    const { username, favoritePokemon, email } = req.body;
    const auth0Id = req.auth.sub;

    if (req.user) {
      return res.status(400).json({ error: "Profile already exists" });
    }

    // Validate username
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: "Username must be 3-20 characters" });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res
        .status(400)
        .json({ error: "Username can only contain letters, numbers, and underscores" });
    }

    // Check if username is taken
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const user = await prisma.user.create({
      data: {
        auth0Id,
        email,
        username,
        favoritePokemon: favoritePokemon || null,
        role: "BUYER",
      },
    });

    console.log(`✅ New user created: ${username}`);
    res.status(201).json({ user, profileComplete: true });
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

// PATCH /api/users/profile - Update profile
router.patch("/profile", authenticated, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ error: "Profile setup required" });
    }

    const { username, favoritePokemon } = req.body;
    const updateData = {};

    if (username !== undefined) {
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: "Username must be 3-20 characters" });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res
          .status(400)
          .json({ error: "Username can only contain letters, numbers, and underscores" });
      }

      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ error: "Username is already taken" });
      }

      updateData.username = username;
    }

    if (favoritePokemon !== undefined) {
      updateData.favoritePokemon = favoritePokemon || null;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    res.json({ user });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// GET /api/users/check-username/:username - Check availability
router.get("/check-username/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    res.json({ available: !existing });
  } catch (error) {
    res.status(500).json({ error: "Failed to check username" });
  }
});

// POST /api/users/seller-request - Request to become a seller
router.post("/seller-request", authenticated, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ error: "Profile setup required" });
    }

    const { reason } = req.body;

    if (req.user.role === "SELLER" || req.user.role === "ADMIN") {
      return res.status(400).json({ error: "You already have seller permissions" });
    }

    // Check for existing pending request
    const existingRequest = await prisma.sellerRequest.findFirst({
      where: { userId: req.user.id, status: "PENDING" },
    });

    if (existingRequest) {
      return res.status(400).json({ error: "You already have a pending request" });
    }

    const sellerRequest = await prisma.sellerRequest.create({
      data: {
        userId: req.user.id,
        reason: reason || null,
      },
    });

    console.log(`📝 Seller request from: ${req.user.username}`);
    res.status(201).json({ request: sellerRequest });
  } catch (error) {
    console.error("Error creating seller request:", error);
    res.status(500).json({ error: "Failed to submit request" });
  }
});

// GET /api/users/seller-request - Get user's seller request status
router.get("/seller-request", authenticated, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ error: "Profile setup required" });
    }

    const requests = await prisma.sellerRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

export default router;
