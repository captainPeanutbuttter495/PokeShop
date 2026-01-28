// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Import routes
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import sellerRoutes from "./routes/seller.js";
import checkoutRoutes from "./routes/checkout.js";
import webhookRoutes from "./routes/webhook.js";
import orderRoutes from "./routes/orders.js";
import cartRoutes from "./routes/cart.js";

const app = express();
const port = process.env.PORT || 3001;

// S3 Cache Configuration
const S3_BUCKET = process.env.AWS_S3_BUCKET || "pokeshop-card-images";
const S3_BASE_URL = `https://${S3_BUCKET}.s3.amazonaws.com`;

// In-memory cache for S3 data (persists while server is running)
const cache = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }

  return item.data;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    expiry: Date.now() + CACHE_DURATION,
  });
}

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  }),
);

// Stripe webhook needs raw body for signature verification
// Must be before express.json() middleware
app.use("/api/webhook/stripe", express.raw({ type: "application/json" }));

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", cacheSize: cache.size });
});

// ============================================
// User & Admin Routes (PostgreSQL/Prisma)
// ============================================
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);

// ============================================
// Featured Cards/Sets Routes (S3 cached data)
// ============================================

// Get featured cards from S3 cache
app.get("/api/featured-cards", async (req, res) => {
  try {
    const cacheKey = "featured-cards";

    const cached = getCached(cacheKey);
    if (cached) {
      console.log("✅ Cache hit for featured cards");
      return res.json(cached);
    }

    console.log("⏳ Fetching featured cards from S3...");
    const response = await fetch(`${S3_BASE_URL}/cache/featured-cards.json`);

    if (!response.ok) {
      throw new Error(`S3 responded with ${response.status}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
    console.log("✅ Featured cards loaded from S3");
    res.json(data);
  } catch (error) {
    console.error("Error fetching featured cards:", error);
    res.status(500).json({ error: "Failed to fetch featured cards" });
  }
});

// Get featured sets from S3 cache
app.get("/api/featured-sets", async (req, res) => {
  try {
    const cacheKey = "featured-sets";

    const cached = getCached(cacheKey);
    if (cached) {
      console.log("✅ Cache hit for featured sets");
      return res.json(cached);
    }

    console.log("⏳ Fetching featured sets from S3...");
    const response = await fetch(`${S3_BASE_URL}/cache/featured-sets.json`);

    if (!response.ok) {
      throw new Error(`S3 responded with ${response.status}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
    console.log("✅ Featured sets loaded from S3");
    res.json(data);
  } catch (error) {
    console.error("Error fetching featured sets:", error);
    res.status(500).json({ error: "Failed to fetch featured sets" });
  }
});

// ============================================
// Error Handling
// ============================================
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  // Handle JWT errors
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ error: "Invalid or missing token" });
  }

  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`🚀 PokeShop API server running on http://localhost:${port}`);
  console.log(`📦 Database: PostgreSQL via Prisma`);
});