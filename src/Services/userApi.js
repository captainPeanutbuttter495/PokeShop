// src/services/userApi.js
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

// ============================================
// User Profile
// ============================================

export async function getProfile(getAccessToken) {
  return authFetch("/users/profile", getAccessToken);
}

export async function createProfile(getAccessToken, data) {
  return authFetch("/users/profile", getAccessToken, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProfile(getAccessToken, data) {
  return authFetch("/users/profile", getAccessToken, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function checkUsername(username) {
  const response = await fetch(`${API_BASE}/users/check-username/${encodeURIComponent(username)}`);
  return response.json();
}

// ============================================
// Seller Requests
// ============================================

export async function getSellerRequestStatus(getAccessToken) {
  return authFetch("/users/seller-request", getAccessToken);
}

export async function submitSellerRequest(getAccessToken, reason) {
  return authFetch("/users/seller-request", getAccessToken, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ============================================
// Admin Endpoints
// ============================================

export async function getSellerRequests(getAccessToken, status = null) {
  const query = status ? `?status=${status}` : "";
  return authFetch(`/admin/seller-requests${query}`, getAccessToken);
}

export async function approveSellerRequest(getAccessToken, requestId, reviewNote = null) {
  return authFetch(`/admin/seller-requests/${requestId}/approve`, getAccessToken, {
    method: "POST",
    body: JSON.stringify({ reviewNote }),
  });
}

export async function rejectSellerRequest(getAccessToken, requestId, reviewNote) {
  return authFetch(`/admin/seller-requests/${requestId}/reject`, getAccessToken, {
    method: "POST",
    body: JSON.stringify({ reviewNote }),
  });
}

export async function getAllUsers(getAccessToken, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const query = params ? `?${params}` : "";
  return authFetch(`/admin/users${query}`, getAccessToken);
}

export async function deactivateUser(getAccessToken, userId) {
  return authFetch(`/admin/users/${userId}/deactivate`, getAccessToken, {
    method: "POST",
  });
}

export async function reactivateUser(getAccessToken, userId) {
  return authFetch(`/admin/users/${userId}/reactivate`, getAccessToken, {
    method: "POST",
  });
}

export async function changeUserRole(getAccessToken, userId, role) {
  return authFetch(`/admin/users/${userId}/role`, getAccessToken, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}
