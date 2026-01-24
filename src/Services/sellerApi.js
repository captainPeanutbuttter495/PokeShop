// src/Services/sellerApi.js
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:3001/api";

// Helper to make authenticated requests with JSON
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

// Helper for multipart form data requests (file uploads)
async function authFormFetch(endpoint, getAccessToken, formData) {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type - browser will set it with boundary for multipart
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// Seller Listings
// ============================================

/**
 * Create a new card listing
 * @param {Function} getAccessToken - Auth0 token getter
 * @param {FormData} formData - Form data with cardName, setName, price, and optional image
 */
export async function createListing(getAccessToken, formData) {
  return authFormFetch("/seller/listings", getAccessToken, formData);
}

/**
 * Get seller's listings
 * @param {Function} getAccessToken - Auth0 token getter
 * @param {string} [status] - Optional status filter (ACTIVE, SOLD, CANCELLED)
 */
export async function getMyListings(getAccessToken, status = null) {
  const query = status ? `?status=${status}` : "";
  return authFetch(`/seller/listings${query}`, getAccessToken);
}

/**
 * Get a specific listing
 * @param {Function} getAccessToken - Auth0 token getter
 * @param {string} listingId - The listing ID
 */
export async function getListing(getAccessToken, listingId) {
  return authFetch(`/seller/listings/${listingId}`, getAccessToken);
}

/**
 * Update a listing
 * @param {Function} getAccessToken - Auth0 token getter
 * @param {string} listingId - The listing ID
 * @param {Object} data - Fields to update (cardName, setName, price, status)
 */
export async function updateListing(getAccessToken, listingId, data) {
  return authFetch(`/seller/listings/${listingId}`, getAccessToken, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a listing
 * @param {Function} getAccessToken - Auth0 token getter
 * @param {string} listingId - The listing ID
 */
export async function deleteListing(getAccessToken, listingId) {
  return authFetch(`/seller/listings/${listingId}`, getAccessToken, {
    method: "DELETE",
  });
}
