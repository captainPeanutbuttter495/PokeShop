// src/services/featuredApi.js - Client for fetching featured cards and sets from our backend

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:3001/api";

/**
 * Fetch featured cards from our S3 cache via backend
 * @returns {Promise<object>} Featured cards data with lastUpdated and cards array
 */
export async function getFeaturedCards() {
  const response = await fetch(`${API_BASE}/featured-cards`);

  if (!response.ok) {
    throw new Error(`Failed to fetch featured cards: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch featured sets from our S3 cache via backend
 * @returns {Promise<object>} Featured sets data with lastUpdated and sets array
 */
export async function getFeaturedSets() {
  const response = await fetch(`${API_BASE}/featured-sets`);

  if (!response.ok) {
    throw new Error(`Failed to fetch featured sets: ${response.status}`);
  }

  return response.json();
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
