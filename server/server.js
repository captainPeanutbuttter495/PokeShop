// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Import routes
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const port = process.env.PORT || 3001;

const POKEMON_API_BASE = "https://api.pokemontcg.io/v2";
const API_KEY = process.env.POKEMON_API_KEY;

// In-memory cache (persists while server is running)
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
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
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

// ============================================
// Pokemon TCG API Routes (with caching)
// ============================================

// Helper function to fetch with retries
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if ((response.status === 504 || response.status === 503) && attempt < maxRetries) {
        console.log(`⚠️ Attempt ${attempt} failed with ${response.status}, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        continue;
      }

      throw new Error(`Pokemon API responded with ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`⚠️ Attempt ${attempt} failed: ${error.message}, retrying...`);
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
      console.log(`✅ Cache hit for card: ${id}`);
      return res.json(cached);
    }

    console.log(`⏳ Fetching card from API: ${id}`);
    const startTime = Date.now();

    const response = await fetchWithRetry(`${POKEMON_API_BASE}/cards/${id}`, {
      headers: {
        "X-Api-Key": API_KEY,
      },
    });

    const data = await response.json();
    const elapsed = Date.now() - startTime;
    console.log(`✅ Fetched card in ${elapsed}ms: ${id}`);

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
      console.log(`✅ Cache hit for search: ${queryParams}`);
      return res.json(cached);
    }

    const url = queryParams
      ? `${POKEMON_API_BASE}/cards?${queryParams}`
      : `${POKEMON_API_BASE}/cards`;

    console.log(`⏳ Searching cards from API: ${queryParams}`);
    const startTime = Date.now();

    const response = await fetchWithRetry(url, {
      headers: {
        "X-Api-Key": API_KEY,
      },
    });

    const data = await response.json();
    const elapsed = Date.now() - startTime;
    console.log(`✅ Search completed in ${elapsed}ms`);

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
      console.log(`✅ Cache hit for set: ${id}`);
      return res.json(cached);
    }

    console.log(`⏳ Fetching set from API: ${id}`);
    const response = await fetchWithRetry(`${POKEMON_API_BASE}/sets/${id}`, {
      headers: {
        "X-Api-Key": API_KEY,
      },
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
      console.log(`✅ Cache hit for sets`);
      return res.json(cached);
    }

    const url = queryParams
      ? `${POKEMON_API_BASE}/sets?${queryParams}`
      : `${POKEMON_API_BASE}/sets`;

    const response = await fetchWithRetry(url, {
      headers: {
        "X-Api-Key": API_KEY,
      },
    });

    const data = await response.json();
    setCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error fetching sets:", error);
    res.status(500).json({ error: "Failed to fetch sets" });
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