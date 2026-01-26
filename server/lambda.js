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

const POKEMON_API_BASE = "https://api.pokemontcg.io/v2";
const API_KEY = process.env.POKEMON_API_KEY;

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

// Helper function to fetch with retries
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (
        (response.status === 504 || response.status === 503) &&
        attempt < maxRetries
      ) {
        console.log(
          `Attempt ${attempt} failed with ${response.status}, retrying...`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        continue;
      }

      throw new Error(`Pokemon API responded with ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`Attempt ${attempt} failed: ${error.message}, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}

// Get a single card by ID
app.get("/api/cards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `card:${id}`;

    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const response = await fetchWithRetry(`${POKEMON_API_BASE}/cards/${id}`, {
      headers: { "X-Api-Key": API_KEY },
    });

    const data = await response.json();
    setCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error fetching card:", error);
    res.status(500).json({ error: "Failed to fetch card data" });
  }
});

// Search cards with query
app.get("/api/cards", async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query).toString();
    const cacheKey = `cards:${queryParams}`;

    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const url = queryParams
      ? `${POKEMON_API_BASE}/cards?${queryParams}`
      : `${POKEMON_API_BASE}/cards`;

    const response = await fetchWithRetry(url, {
      headers: { "X-Api-Key": API_KEY },
    });

    const data = await response.json();
    setCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error searching cards:", error);
    res.status(500).json({ error: "Failed to search cards" });
  }
});

// Get a single set by ID
app.get("/api/sets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `set:${id}`;

    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const response = await fetchWithRetry(`${POKEMON_API_BASE}/sets/${id}`, {
      headers: { "X-Api-Key": API_KEY },
    });

    const data = await response.json();
    setCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error fetching set:", error);
    res.status(500).json({ error: "Failed to fetch set data" });
  }
});

// Get all sets
app.get("/api/sets", async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query).toString();
    const cacheKey = `sets:${queryParams}`;

    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const url = queryParams
      ? `${POKEMON_API_BASE}/sets?${queryParams}`
      : `${POKEMON_API_BASE}/sets`;

    const response = await fetchWithRetry(url, {
      headers: { "X-Api-Key": API_KEY },
    });

    const data = await response.json();
    setCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error fetching sets:", error);
    res.status(500).json({ error: "Failed to fetch sets" });
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
