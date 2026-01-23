const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:3001/api";

// Frontend cache - persists across component mounts
const cardCache = new Map();

// Only fetch fields needed by the UI (reduces payload size significantly)
const CARD_SELECT_FIELDS = "id,name,rarity,images,set,tcgplayer";

/**
 * Fetch a single card by its ID
 * @param {string} id - The card ID (e.g., 'base1-4' for Charizard from Base Set)
 * @returns {Promise<object>} The card data
 */
export async function getCard(id) {
  // Check frontend cache first
  if (cardCache.has(id)) {
    return cardCache.get(id);
  }

  const response = await fetch(
    `${API_BASE}/cards/${id}?select=${CARD_SELECT_FIELDS}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch card: ${response.status}`);
  }

  const result = await response.json();

  // Cache the result
  cardCache.set(id, result.data);

  return result.data;
}

/**
 * Search for cards with optional query parameters
 * @param {object} params - Query parameters (q, page, pageSize, orderBy, select)
 * @returns {Promise<object>} The search results with data and pagination info
 */
export async function searchCards(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${API_BASE}/cards?${queryString}` : `${API_BASE}/cards`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to search cards: ${response.status}`);
  }

  return response.json();
}

// Only fetch fields needed by the UI for sets
const SET_SELECT_FIELDS = "id,name,images";

/**
 * Fetch a single set by its ID
 * @param {string} id - The set ID (e.g., 'base1' for Base Set)
 * @returns {Promise<object>} The set data
 */
export async function getSet(id) {
  const response = await fetch(
    `${API_BASE}/sets/${id}?select=${SET_SELECT_FIELDS}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch set: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Search for sets with optional query parameters
 * @param {object} params - Query parameters (q, page, pageSize, orderBy, select)
 * @returns {Promise<object>} The search results with data and pagination info
 */
export async function searchSets(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${API_BASE}/sets?${queryString}` : `${API_BASE}/sets`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to search sets: ${response.status}`);
  }

  return response.json();
}

/**
 * Get the best available price from a card's tcgplayer data
 * @param {object} tcgplayer - The tcgplayer object from a card
 * @returns {number|null} The market price or null if unavailable
 */
export function getBestPrice(tcgplayer) {
  if (!tcgplayer?.prices) return null;

  const priceTypes = [
    "holofoil",
    "normal",
    "reverseHolofoil",
    "1stEditionHolofoil",
    "1stEditionNormal",
  ];

  for (const type of priceTypes) {
    if (tcgplayer.prices[type]?.market) {
      return {
        price: tcgplayer.prices[type].market,
        type: type,
      };
    }
  }

  return null;
}

/**
 * Format a price for display
 * @param {number} price - The price in USD
 * @returns {string} Formatted price string
 */
export function formatPrice(price) {
  if (price === null || price === undefined) return "Price unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}
