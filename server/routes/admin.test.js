// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import {
  adminUser,
  buyerUser,
  sellerUser,
  pendingSellerRequest,
  approvedSellerRequest,
  getApp,
} from "../test/helpers.js";

// ─── Mocks ─────────────────────────────────────────────────────────

// Hoist mock functions so vi.mock() factories can reference them
const { mockCheckJwt, mockAttachUser, prismaMock } = vi.hoisted(() => {
  const mockCheckJwt = vi.fn((req, res, next) => next());
  const mockAttachUser = vi.fn((req, res, next) => next());

  const prismaMock = {
    sellerRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return { mockCheckJwt, mockAttachUser, prismaMock };
});

// Mock Prisma
vi.mock("../db.js", () => ({ default: prismaMock }));

// Mock express-jwt (prevents real JWT config from running at import time)
vi.mock("express-jwt", () => ({
  expressjwt: vi.fn(() => mockCheckJwt),
}));

vi.mock("jwks-rsa", () => ({
  default: { expressJwtSecret: vi.fn(() => vi.fn()) },
}));

// Mock auth middleware — keep real RBAC, replace JWT/user lookup
vi.mock("../middleware/auth.js", async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    checkJwt: mockCheckJwt,
    attachUser: mockAttachUser,
    authenticated: [mockCheckJwt, mockAttachUser],
  };
});

// ─── Auth Helpers ──────────────────────────────────────────────────

function asAdmin() {
  mockCheckJwt.mockImplementation((req, res, next) => {
    req.auth = { sub: adminUser.auth0Id };
    next();
  });
  mockAttachUser.mockImplementation((req, res, next) => {
    req.user = adminUser;
    next();
  });
}

function asBuyer() {
  mockCheckJwt.mockImplementation((req, res, next) => {
    req.auth = { sub: buyerUser.auth0Id };
    next();
  });
  mockAttachUser.mockImplementation((req, res, next) => {
    req.user = buyerUser;
    next();
  });
}

function asSeller() {
  mockCheckJwt.mockImplementation((req, res, next) => {
    req.auth = { sub: sellerUser.auth0Id };
    next();
  });
  mockAttachUser.mockImplementation((req, res, next) => {
    req.user = sellerUser;
    next();
  });
}

function asUnauthenticated() {
  mockCheckJwt.mockImplementation((req, res, next) => {
    const err = new Error("No authorization token was found");
    err.name = "UnauthorizedError";
    err.status = 401;
    next(err);
  });
  mockAttachUser.mockImplementation((req, res, next) => next());
}

// ─── Setup ─────────────────────────────────────────────────────────

let app;

beforeEach(async () => {
  vi.resetAllMocks();
  asAdmin(); // default to admin for most tests
  app = await getApp();
});

// ─── Auth & RBAC ───────────────────────────────────────────────────

describe("Admin routes — Auth & RBAC", () => {
  it("returns 401 when no token is provided", async () => {
    asUnauthenticated();
    const res = await request(app).get("/api/admin/seller-requests");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or missing token");
  });

  it("returns 403 for BUYER role", async () => {
    asBuyer();
    const res = await request(app).get("/api/admin/seller-requests");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Insufficient permissions");
  });

  it("returns 403 for SELLER role", async () => {
    asSeller();
    const res = await request(app).get("/api/admin/seller-requests");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Insufficient permissions");
  });

  it("returns 200 for ADMIN role", async () => {
    prismaMock.sellerRequest.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/admin/seller-requests");
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/admin/seller-requests ────────────────────────────────

describe("GET /api/admin/seller-requests", () => {
  it("returns all requests and queries correct shape", async () => {
    prismaMock.sellerRequest.findMany.mockResolvedValue([pendingSellerRequest]);
    const res = await request(app).get("/api/admin/seller-requests");
    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(1);
    expect(res.body.requests[0].id).toBe(pendingSellerRequest.id);

    expect(prismaMock.sellerRequest.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            favoritePokemon: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("filters by status query param", async () => {
    prismaMock.sellerRequest.findMany.mockResolvedValue([]);
    await request(app).get("/api/admin/seller-requests?status=pending");
    expect(prismaMock.sellerRequest.findMany).toHaveBeenCalledWith({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            favoritePokemon: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns 500 when database fails", async () => {
    prismaMock.sellerRequest.findMany.mockRejectedValue(new Error("DB connection lost"));
    const res = await request(app).get("/api/admin/seller-requests");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to fetch requests");
    expect(prismaMock.sellerRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});

// ─── POST /api/admin/seller-requests/:id/approve ──────────────────

describe("POST /api/admin/seller-requests/:id/approve", () => {
  it("approves a pending request with correct wiring", async () => {
    prismaMock.sellerRequest.findUnique.mockResolvedValue(pendingSellerRequest);
    const updatedRequest = { ...pendingSellerRequest, status: "APPROVED" };
    const updatedUser = { ...pendingSellerRequest.user, role: "SELLER" };
    prismaMock.sellerRequest.update.mockResolvedValue(updatedRequest);
    prismaMock.user.update.mockResolvedValue(updatedUser);
    prismaMock.$transaction.mockResolvedValue([updatedRequest, updatedUser]);

    const res = await request(app)
      .post(`/api/admin/seller-requests/${pendingSellerRequest.id}/approve`)
      .send({ reviewNote: "Looks good" });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe("APPROVED");

    // findUnique includes user for the console log + userId reference
    expect(prismaMock.sellerRequest.findUnique).toHaveBeenCalledWith({
      where: { id: pendingSellerRequest.id },
      include: { user: true },
    });

    // Transaction contains both updates
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();

    // sellerRequest.update wires reviewedById to admin, reviewNote from body
    expect(prismaMock.sellerRequest.update).toHaveBeenCalledWith({
      where: { id: pendingSellerRequest.id },
      data: {
        status: "APPROVED",
        reviewedById: adminUser.id,
        reviewedAt: expect.any(Date),
        reviewNote: "Looks good",
      },
    });

    // user.update promotes the requesting user to SELLER
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: pendingSellerRequest.userId },
      data: { role: "SELLER" },
    });
  });

  it("stores null when reviewNote is omitted", async () => {
    prismaMock.sellerRequest.findUnique.mockResolvedValue(pendingSellerRequest);
    const updatedRequest = { ...pendingSellerRequest, status: "APPROVED" };
    prismaMock.sellerRequest.update.mockResolvedValue(updatedRequest);
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.$transaction.mockResolvedValue([updatedRequest, {}]);

    const res = await request(app)
      .post(`/api/admin/seller-requests/${pendingSellerRequest.id}/approve`)
      .send({});

    expect(res.status).toBe(200);
    expect(prismaMock.sellerRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewNote: null }),
      }),
    );
  });

  it("returns 404 for missing request", async () => {
    prismaMock.sellerRequest.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/admin/seller-requests/nonexistent/approve")
      .send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Request not found");
  });

  it("returns 400 for already-processed request", async () => {
    prismaMock.sellerRequest.findUnique.mockResolvedValue(approvedSellerRequest);
    const res = await request(app)
      .post(`/api/admin/seller-requests/${approvedSellerRequest.id}/approve`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Request already processed");
  });

  it("returns 500 when transaction fails", async () => {
    prismaMock.sellerRequest.findUnique.mockResolvedValue(pendingSellerRequest);
    prismaMock.sellerRequest.update.mockResolvedValue({});
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.$transaction.mockRejectedValue(new Error("DB connection lost"));

    const res = await request(app)
      .post(`/api/admin/seller-requests/${pendingSellerRequest.id}/approve`)
      .send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to approve request");
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });
});

// ─── POST /api/admin/seller-requests/:id/reject ───────────────────

describe("POST /api/admin/seller-requests/:id/reject", () => {
  it("rejects with custom reviewNote and correct wiring", async () => {
    const { user, ...requestWithoutUser } = pendingSellerRequest;
    prismaMock.sellerRequest.findUnique.mockResolvedValue(requestWithoutUser);
    const updatedRequest = {
      ...requestWithoutUser,
      status: "REJECTED",
      reviewNote: "Not enough info",
    };
    prismaMock.sellerRequest.update.mockResolvedValue(updatedRequest);

    const res = await request(app)
      .post(`/api/admin/seller-requests/${pendingSellerRequest.id}/reject`)
      .send({ reviewNote: "Not enough info" });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe("REJECTED");
    expect(res.body.request.reviewNote).toBe("Not enough info");

    expect(prismaMock.sellerRequest.findUnique).toHaveBeenCalledWith({
      where: { id: pendingSellerRequest.id },
    });
    expect(prismaMock.sellerRequest.update).toHaveBeenCalledWith({
      where: { id: pendingSellerRequest.id },
      data: {
        status: "REJECTED",
        reviewedById: adminUser.id,
        reviewedAt: expect.any(Date),
        reviewNote: "Not enough info",
      },
    });
  });

  it("uses default reviewNote when omitted", async () => {
    const { user, ...requestWithoutUser } = pendingSellerRequest;
    prismaMock.sellerRequest.findUnique.mockResolvedValue(requestWithoutUser);
    const updatedRequest = {
      ...requestWithoutUser,
      status: "REJECTED",
      reviewNote: "Request rejected",
    };
    prismaMock.sellerRequest.update.mockResolvedValue(updatedRequest);

    const res = await request(app)
      .post(`/api/admin/seller-requests/${pendingSellerRequest.id}/reject`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.request.reviewNote).toBe("Request rejected");
    expect(prismaMock.sellerRequest.update).toHaveBeenCalledWith({
      where: { id: pendingSellerRequest.id },
      data: {
        status: "REJECTED",
        reviewedById: adminUser.id,
        reviewedAt: expect.any(Date),
        reviewNote: "Request rejected",
      },
    });
  });

  it("returns 404 for missing request", async () => {
    prismaMock.sellerRequest.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/admin/seller-requests/nonexistent/reject")
      .send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Request not found");
  });

  it("returns 400 for already-processed request", async () => {
    prismaMock.sellerRequest.findUnique.mockResolvedValue(approvedSellerRequest);
    const res = await request(app)
      .post(`/api/admin/seller-requests/${approvedSellerRequest.id}/reject`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Request already processed");
  });

  it("returns 500 when update fails", async () => {
    const { user, ...requestWithoutUser } = pendingSellerRequest;
    prismaMock.sellerRequest.findUnique.mockResolvedValue(requestWithoutUser);
    prismaMock.sellerRequest.update.mockRejectedValue(new Error("DB connection lost"));

    const res = await request(app)
      .post(`/api/admin/seller-requests/${pendingSellerRequest.id}/reject`)
      .send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to reject request");
    expect(prismaMock.sellerRequest.update).toHaveBeenCalledOnce();
  });
});

// ─── GET /api/admin/users ──────────────────────────────────────────

describe("GET /api/admin/users", () => {
  const expectedSelect = {
    id: true,
    username: true,
    email: true,
    favoritePokemon: true,
    role: true,
    isActive: true,
    createdAt: true,
  };

  it("returns all users and queries correct shape", async () => {
    prismaMock.user.findMany.mockResolvedValue([adminUser, buyerUser]);
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {},
      select: expectedSelect,
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns 500 when database fails", async () => {
    prismaMock.user.findMany.mockRejectedValue(new Error("DB connection lost"));
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to fetch users");
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it("filters by role and active together", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    await request(app).get("/api/admin/users?role=buyer&active=true");
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { role: "BUYER", isActive: true },
      select: expectedSelect,
      orderBy: { createdAt: "desc" },
    });
  });
});

// ─── POST /api/admin/users/:id/deactivate ──────────────────────────

describe("POST /api/admin/users/:id/deactivate", () => {
  it("deactivates a user with correct wiring", async () => {
    prismaMock.user.findUnique.mockResolvedValue(buyerUser);
    prismaMock.user.update.mockResolvedValue({ ...buyerUser, isActive: false });

    const res = await request(app).post(`/api/admin/users/${buyerUser.id}/deactivate`);
    expect(res.status).toBe(200);
    expect(res.body.user.isActive).toBe(false);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: buyerUser.id },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: buyerUser.id },
      data: { isActive: false },
    });
  });

  it("returns 400 when trying to deactivate yourself", async () => {
    const res = await request(app).post(`/api/admin/users/${adminUser.id}/deactivate`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot deactivate yourself");
  });

  it("returns 400 when deactivating another admin", async () => {
    const otherAdmin = { ...adminUser, id: "admin-id-2", role: "ADMIN" };
    prismaMock.user.findUnique.mockResolvedValue(otherAdmin);

    const res = await request(app).post(`/api/admin/users/${otherAdmin.id}/deactivate`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot deactivate admin accounts");
  });

  it("returns 404 for missing user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await request(app).post("/api/admin/users/nonexistent/deactivate");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });

  it("returns 500 when update fails", async () => {
    prismaMock.user.findUnique.mockResolvedValue(buyerUser);
    prismaMock.user.update.mockRejectedValue(new Error("DB connection lost"));

    const res = await request(app).post(`/api/admin/users/${buyerUser.id}/deactivate`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to deactivate user");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: buyerUser.id },
      data: { isActive: false },
    });
  });
});

// ─── POST /api/admin/users/:id/reactivate ──────────────────────────

describe("POST /api/admin/users/:id/reactivate", () => {
  it("reactivates a user with correct wiring", async () => {
    prismaMock.user.update.mockResolvedValue({ ...buyerUser, isActive: true });
    const res = await request(app).post(`/api/admin/users/${buyerUser.id}/reactivate`);
    expect(res.status).toBe(200);
    expect(res.body.user.isActive).toBe(true);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: buyerUser.id },
      data: { isActive: true },
    });
  });

  it("returns 500 when update fails", async () => {
    prismaMock.user.update.mockRejectedValue(new Error("DB connection lost"));
    const res = await request(app).post(`/api/admin/users/${buyerUser.id}/reactivate`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to reactivate user");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: buyerUser.id },
      data: { isActive: true },
    });
  });
});

// ─── PATCH /api/admin/users/:id/role ───────────────────────────────

describe("PATCH /api/admin/users/:id/role", () => {
  it("changes user role with correct wiring", async () => {
    prismaMock.user.update.mockResolvedValue({ ...buyerUser, role: "SELLER" });
    const res = await request(app)
      .patch(`/api/admin/users/${buyerUser.id}/role`)
      .send({ role: "SELLER" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("SELLER");

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: buyerUser.id },
      data: { role: "SELLER" },
    });
  });

  it("returns 400 for invalid role", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${buyerUser.id}/role`)
      .send({ role: "SUPERADMIN" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid role");
  });

  it("returns 400 when changing your own role", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${adminUser.id}/role`)
      .send({ role: "BUYER" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot change your own role");
  });

  it("returns 500 when update fails", async () => {
    prismaMock.user.update.mockRejectedValue(new Error("DB connection lost"));
    const res = await request(app)
      .patch(`/api/admin/users/${buyerUser.id}/role`)
      .send({ role: "SELLER" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to change role");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: buyerUser.id },
      data: { role: "SELLER" },
    });
  });
});
