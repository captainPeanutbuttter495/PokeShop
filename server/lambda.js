// server/lambda.js - Lambda handler for Express app
import serverlessExpress from "@vendia/serverless-express";
import express from "express";
import cors from "cors";

// Import routes
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import sellerRoutes from "./routes/seller.js";
import checkoutRoutes from "./routes/checkout.js";
import webhookRoutes from "./routes/webhook.js";
import orderRoutes from "./routes/orders.js";
import cartRoutes from "./routes/cart.js";

const app = express();

// S3 Cache Configuration
const S3_BUCKET = process.env.AWS_S3_BUCKET || "pokeshop-card-images";
const S3_BASE_URL = `https://${S3_BUCKET}.s3.amazonaws.com`;

// In-memory cache (resets on cold starts, but persists across warm invocations)
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

// Middleware - Allow CloudFront/S3 origin
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://chrillspoketcg.click",
  "https://www.chrillspoketcg.click",
  "https://d2q6j9upt9u7yj.cloudfront.net",
  "http://localhost:5173",
].filter(Boolean);

console.log("CORS allowed origins:", allowedOrigins);

// Handle preflight OPTIONS requests explicitly (before any other middleware)
// This ensures CORS preflight always succeeds even if other middleware errors
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.some((allowed) => origin === allowed || origin.startsWith(allowed))) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Access-Control-Max-Age", "86400");
  }
  res.status(204).send();
});

app.use(
  cors({
    origin: (origin, callback) => {
      console.log("Request origin:", origin);
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((allowed) => origin === allowed || origin.startsWith(allowed))) {
        return callback(null, true);
      }
      console.log("CORS rejected origin:", origin);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Stripe webhook needs raw body for signature verification
// Must be before express.json() middleware
app.use("/api/webhook/stripe", express.raw({ type: "application/json" }));

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", cacheSize: cache.size, environment: "lambda" });
});

// User & Admin Routes (PostgreSQL/Prisma)
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
      return res.json(cached);
    }

    const response = await fetch(`${S3_BASE_URL}/cache/featured-cards.json`);

    if (!response.ok) {
      throw new Error(`S3 responded with ${response.status}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
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
      return res.json(cached);
    }

    const response = await fetch(`${S3_BASE_URL}/cache/featured-sets.json`);

    if (!response.ok) {
      throw new Error(`S3 responded with ${response.status}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error fetching featured sets:", error);
    res.status(500).json({ error: "Failed to fetch featured sets" });
  }
});

// Error Handling
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ error: "Invalid or missing token" });
  }

  res.status(500).json({ error: "Internal server error" });
});

// Export the serverless handler
export const handler = serverlessExpress({ app });
