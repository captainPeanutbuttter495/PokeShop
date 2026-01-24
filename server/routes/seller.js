// server/routes/seller.js
import { Router } from "express";
import multer from "multer";
import prisma from "../db.js";
import { authenticated, requireSeller } from "../middleware/auth.js";
import { uploadToS3, deleteFromS3, extractS3Key } from "../lib/s3.js";

const router = Router();

// Configure multer for memory storage (we'll upload to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."));
    }
  },
});

// All routes require authentication and seller role
router.use(authenticated);
router.use(requireSeller);

// POST /api/seller/listings - Create a new listing
router.post("/listings", upload.single("image"), async (req, res) => {
  try {
    const { cardName, setName, price } = req.body;

    // Validation
    if (!cardName || cardName.trim() === "") {
      return res.status(400).json({ error: "Card name is required" });
    }

    if (!setName || setName.trim() === "") {
      return res.status(400).json({ error: "Set name is required" });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: "Price must be a positive number" });
    }

    if (priceNum > 99999999.99) {
      return res.status(400).json({ error: "Price exceeds maximum allowed value" });
    }

    let imageUrl = null;

    // Upload image to S3 if provided
    if (req.file) {
      const timestamp = Date.now();
      const extension = req.file.mimetype.split("/")[1];
      const key = `listings/${req.user.id}/${timestamp}.${extension}`;

      imageUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);
    }

    const listing = await prisma.cardListing.create({
      data: {
        sellerId: req.user.id,
        cardName: cardName.trim(),
        setName: setName.trim(),
        price: priceNum,
        imageUrl,
      },
    });

    console.log(`📦 New listing created: ${cardName} by ${req.user.username}`);
    res.status(201).json({ listing });
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ error: "Failed to create listing" });
  }
});

// GET /api/seller/listings - Get seller's listings
router.get("/listings", async (req, res) => {
  try {
    const { status } = req.query;

    const where = { sellerId: req.user.id };

    if (status && ["ACTIVE", "SOLD", "CANCELLED"].includes(status)) {
      where.status = status;
    }

    const listings = await prisma.cardListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ listings });
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// GET /api/seller/listings/:id - Get a specific listing
router.get("/listings/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await prisma.cardListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Verify ownership
    if (listing.sellerId !== req.user.id) {
      return res.status(403).json({ error: "You do not own this listing" });
    }

    res.json({ listing });
  } catch (error) {
    console.error("Error fetching listing:", error);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

// PATCH /api/seller/listings/:id - Update a listing
router.patch("/listings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cardName, setName, price, status } = req.body;

    const listing = await prisma.cardListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Verify ownership
    if (listing.sellerId !== req.user.id) {
      return res.status(403).json({ error: "You do not own this listing" });
    }

    const updateData = {};

    if (cardName !== undefined) {
      if (cardName.trim() === "") {
        return res.status(400).json({ error: "Card name cannot be empty" });
      }
      updateData.cardName = cardName.trim();
    }

    if (setName !== undefined) {
      if (setName.trim() === "") {
        return res.status(400).json({ error: "Set name cannot be empty" });
      }
      updateData.setName = setName.trim();
    }

    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({ error: "Price must be a positive number" });
      }
      if (priceNum > 99999999.99) {
        return res.status(400).json({ error: "Price exceeds maximum allowed value" });
      }
      updateData.price = priceNum;
    }

    if (status !== undefined) {
      if (!["ACTIVE", "SOLD", "CANCELLED"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      updateData.status = status;
    }

    const updatedListing = await prisma.cardListing.update({
      where: { id },
      data: updateData,
    });

    res.json({ listing: updatedListing });
  } catch (error) {
    console.error("Error updating listing:", error);
    res.status(500).json({ error: "Failed to update listing" });
  }
});

// DELETE /api/seller/listings/:id - Delete a listing
router.delete("/listings/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await prisma.cardListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Verify ownership
    if (listing.sellerId !== req.user.id) {
      return res.status(403).json({ error: "You do not own this listing" });
    }

    // Delete image from S3 if exists
    if (listing.imageUrl) {
      const s3Key = extractS3Key(listing.imageUrl);
      if (s3Key) {
        try {
          await deleteFromS3(s3Key);
        } catch (s3Error) {
          console.error("Failed to delete S3 image:", s3Error);
          // Continue with listing deletion even if S3 delete fails
        }
      }
    }

    await prisma.cardListing.delete({
      where: { id },
    });

    console.log(`🗑️ Listing deleted: ${listing.cardName} by ${req.user.username}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

export default router;
