import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const POKEMON_API_BASE = "https://api.pokemontcg.io/v2";
const API_KEY = process.env.POKEMON_API_KEY;

// Enable CORS for the frontend
app.use(
  cors({
    origin: "http://localhost:5173", // Vite's default port
  }),
);

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Get a single card by ID
app.get("/api/cards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${POKEMON_API_BASE}/cards/${id}`, {
      headers: {
        "X-Api-Key": API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Pokemon API responded with ${response.status}`);
    }

    const data = await response.json();
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
    const url = queryParams
      ? `${POKEMON_API_BASE}/cards?${queryParams}`
      : `${POKEMON_API_BASE}/cards`;

    const response = await fetch(url, {
      headers: {
        "X-Api-Key": API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Pokemon API responded with ${response.status}`);
    }

    const data = await response.json();
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
    const response = await fetch(`${POKEMON_API_BASE}/sets/${id}`, {
      headers: {
        "X-Api-Key": API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Pokemon API responded with ${response.status}`);
    }

    const data = await response.json();
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
    const url = queryParams
      ? `${POKEMON_API_BASE}/sets?${queryParams}`
      : `${POKEMON_API_BASE}/sets`;

    const response = await fetch(url, {
      headers: {
        "X-Api-Key": API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Pokemon API responded with ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching sets:", error);
    res.status(500).json({ error: "Failed to fetch sets" });
  }
});

app.listen(port, () => {
  console.log(`🚀 PokeShop API server running on http://localhost:${port}`);
});
