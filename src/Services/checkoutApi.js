// src/Services/checkoutApi.js
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
 * Create a Stripe checkout session for a listing
 * @param {Function} getAccessToken - Auth0 token getter
 * @param {string} listingId - The listing ID to purchase
 * @returns {Promise<{url: string, sessionId: string}>}
 */
export async function createCheckoutSession(getAccessToken, listingId) {
  return authFetch("/checkout/create-session", getAccessToken, {
    method: "POST",
    body: JSON.stringify({ listingId }),
  });
}

/**
 * Verify checkout session status (public, no auth required)
 * @param {string} sessionId - Stripe checkout session ID
 * @returns {Promise<{status: string, cardName: string, ...}>}
 */
export async function verifyCheckoutSession(sessionId) {
  const response = await fetch(`${API_BASE}/checkout/verify/${sessionId}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Get checkout session/order status
 * @param {Function} getAccessToken - Auth0 token getter
 * @param {string} sessionId - Stripe checkout session ID
 * @returns {Promise<{order: Object}>}
 */
export async function getCheckoutSession(getAccessToken, sessionId) {
  return authFetch(`/checkout/session/${sessionId}`, getAccessToken);
}

/**
 * Get buyer's order history
 * @param {Function} getAccessToken - Auth0 token getter
 * @returns {Promise<{orders: Array}>}
 */
export async function getMyOrders(getAccessToken) {
  return authFetch("/orders", getAccessToken);
}

/**
 * Get seller's sales history
 * @param {Function} getAccessToken - Auth0 token getter
 * @returns {Promise<{orders: Array}>}
 */
export async function getMySales(getAccessToken) {
  return authFetch("/orders/sales", getAccessToken);
}

/**
 * Get a specific order by ID
 * @param {Function} getAccessToken - Auth0 token getter
 * @param {string} orderId - The order ID
 * @returns {Promise<{order: Object}>}
 */
export async function getOrder(getAccessToken, orderId) {
  return authFetch(`/orders/${orderId}`, getAccessToken);
}
