// server/test/helpers.js
// Shared fixtures and helpers for backend route tests

// ─── Fixture Data ──────────────────────────────────────────────────

export const adminUser = {
  id: "admin-id-1",
  auth0Id: "auth0|admin1",
  username: "admin_user",
  email: "admin@test.com",
  role: "ADMIN",
  isActive: true,
  favoritePokemon: "Charizard",
  createdAt: new Date("2024-01-01"),
};

export const buyerUser = {
  id: "buyer-id-1",
  auth0Id: "auth0|buyer1",
  username: "buyer_user",
  email: "buyer@test.com",
  role: "BUYER",
  isActive: true,
  favoritePokemon: "Pikachu",
  createdAt: new Date("2024-02-01"),
};

export const sellerUser = {
  id: "seller-id-1",
  auth0Id: "auth0|seller1",
  username: "seller_user",
  email: "seller@test.com",
  role: "SELLER",
  isActive: true,
  favoritePokemon: "Mewtwo",
  createdAt: new Date("2024-03-01"),
};

export const pendingSellerRequest = {
  id: "req-id-1",
  userId: buyerUser.id,
  status: "PENDING",
  reason: "I want to sell cards",
  reviewedById: null,
  reviewedAt: null,
  reviewNote: null,
  createdAt: new Date("2024-04-01"),
  user: buyerUser,
};

const otherBuyer = {
  id: "other-buyer-id",
  auth0Id: "auth0|other1",
  username: "other_buyer",
  email: "other@test.com",
  role: "BUYER",
  isActive: true,
  favoritePokemon: null,
  createdAt: new Date("2024-03-15"),
};

export const approvedSellerRequest = {
  id: "req-id-2",
  userId: otherBuyer.id,
  status: "APPROVED",
  reason: "Love collecting",
  reviewedById: adminUser.id,
  reviewedAt: new Date("2024-04-15"),
  reviewNote: "Welcome aboard",
  createdAt: new Date("2024-04-10"),
  user: otherBuyer,
};

// ─── Lazy App Import ───────────────────────────────────────────────

let _app;

export async function getApp() {
  if (!_app) {
    const mod = await import("../app.js");
    _app = mod.default;
  }
  return _app;
}

export function resetApp() {
  _app = undefined;
}
