// src/Services/cartApi.js
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:3001/api";

// Helper to make authenticated requests
async function authFetch(endpoint, getAccessToken, options = {}) {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get user's cart with listing details
 * @param {Function} getAccessToken - Auth0 token getter
 * @returns {Promise<{items: Array, removedCount: number}>}
 */
export async function getCart(getAccessToken) {
  return authFetch("/cart", getAccessToken);
}

/**
 * Add a listing to cart
 * @param {Function} getAccessToken - Auth0 token getter
 * @param {string} listingId - The listing ID to add
 * @returns {Promise<{item: Object}>}
 */
export async function addToCart(getAccessToken, listingId) {
  return authFetch("/cart", getAccessToken, {
    method: "POST",
    body: JSON.stringify({ listingId }),
  });
}

/**
 * Remove a listing from cart
 * @param {Function} getAccessToken - Auth0 token getter
 * @param {string} listingId - The listing ID to remove
 * @returns {Promise<{message: string}>}
 */
export async function removeFromCart(getAccessToken, listingId) {
  return authFetch(`/cart/${listingId}`, getAccessToken, {
    method: "DELETE",
  });
}

/**
 * Clear entire cart
 * @param {Function} getAccessToken - Auth0 token getter
 * @returns {Promise<{message: string, deletedCount: number}>}
 */
export async function clearCart(getAccessToken) {
  return authFetch("/cart/clear", getAccessToken, {
    method: "DELETE",
  });
}

/**
 * Create a Stripe checkout session for cart items
 * @param {Function} getAccessToken - Auth0 token getter
 * @param {string[]} listingIds - Array of listing IDs to checkout
 * @returns {Promise<{url: string, sessionId: string}>}
 */
export async function createCartCheckoutSession(getAccessToken, listingIds) {
  return authFetch("/checkout/create-cart-session", getAccessToken, {
    method: "POST",
    body: JSON.stringify({ listingIds }),
  });
}
