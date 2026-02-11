// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import {
  buyerUser,
  sellerUser,
  pendingSellerRequest,
  getApp,
} from "../test/helpers.js";

// ─── Mocks ─────────────────────────────────────────────────────────

const { mockCheckJwt, mockAttachUser, prismaMock } = vi.hoisted(() => {
  const mockCheckJwt = vi.fn((req, res, next) => next());
  const mockAttachUser = vi.fn((req, res, next) => next());

  const prismaMock = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    sellerRequest: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };

  return { mockCheckJwt, mockAttachUser, prismaMock };
});

vi.mock("../db.js", () => ({ default: prismaMock }));

vi.mock("express-jwt", () => ({
  expressjwt: vi.fn(() => mockCheckJwt),
}));

vi.mock("jwks-rsa", () => ({
  default: { expressJwtSecret: vi.fn(() => vi.fn()) },
}));

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

function asNewUser() {
  mockCheckJwt.mockImplementation((req, res, next) => {
    req.auth = { sub: "auth0|newuser1" };
    next();
  });
  mockAttachUser.mockImplementation((req, res, next) => {
    req.user = null;
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
  asBuyer(); // default
  app = await getApp();
});

// ─── Public: GET /api/users/sellers ────────────────────────────────

describe("GET /api/users/sellers", () => {
  it("returns active sellers and queries correct shape", async () => {
    prismaMock.user.findMany.mockResolvedValue([sellerUser]);

    const res = await request(app).get("/api/users/sellers");
    expect(res.status).toBe(200);
    expect(res.body.sellers).toHaveLength(1);

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        role: { in: ["SELLER", "ADMIN"] },
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        favoritePokemon: true,
        createdAt: true,
        _count: {
          select: {
            cardListings: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: { username: "asc" },
    });
  });

  it("returns 500 when database fails", async () => {
    prismaMock.user.findMany.mockRejectedValue(new Error("DB connection lost"));
    const res = await request(app).get("/api/users/sellers");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to fetch sellers");
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
  });

  it("supports exclude param while keeping base constraints", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    await request(app).get(`/api/users/sellers?exclude=${sellerUser.id}`);

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        role: { in: ["SELLER", "ADMIN"] },
        isActive: true,
        id: { not: sellerUser.id },
      },
      select: {
        id: true,
        username: true,
        favoritePokemon: true,
        createdAt: true,
        _count: {
          select: {
            cardListings: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: { username: "asc" },
    });
  });
});

// ─── Public: GET /api/users/sellers/:username ──────────────────────

describe("GET /api/users/sellers/:username", () => {
  it("returns seller profile with listings and queries correct shape", async () => {
    const sellerWithListings = {
      ...sellerUser,
      cardListings: [
        {
          id: "listing-1",
          cardName: "Charizard",
          setName: "Base Set",
          price: 25.0,
          imageUrl: "https://example.com/charizard.png",
          createdAt: new Date("2024-05-01"),
        },
      ],
    };
    prismaMock.user.findUnique.mockResolvedValue(sellerWithListings);

    const res = await request(app).get(`/api/users/sellers/${sellerUser.username}`);
    expect(res.status).toBe(200);
    expect(res.body.seller.username).toBe(sellerUser.username);
    expect(res.body.seller.cardListings).toHaveLength(1);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { username: sellerUser.username },
      select: {
        id: true,
        username: true,
        favoritePokemon: true,
        role: true,
        isActive: true,
        createdAt: true,
        cardListings: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            cardName: true,
            setName: true,
            price: true,
            imageUrl: true,
            createdAt: true,
          },
        },
      },
    });
  });

  it("returns 500 when database fails", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("DB connection lost"));
    const res = await request(app).get(`/api/users/sellers/${sellerUser.username}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to fetch seller");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { username: sellerUser.username },
      }),
    );
  });

  it("returns 404 for non-existent user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/users/sellers/nobody");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Seller not found");
  });

  it("returns 404 for a BUYER (not a seller)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...buyerUser, cardListings: [] });
    const res = await request(app).get(`/api/users/sellers/${buyerUser.username}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Seller not found");
  });

  it("returns 404 for inactive seller", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...sellerUser,
      isActive: false,
      cardListings: [],
    });
    const res = await request(app).get(`/api/users/sellers/${sellerUser.username}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Seller not found");
  });
});

// ─── Public: GET /api/users/check-username/:username ───────────────

describe("GET /api/users/check-username/:username", () => {
  it("returns available: true when username is free", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/users/check-username/newname");
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { username: "newname" },
      select: { id: true },
    });
  });

  it("returns available: false when username is taken", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "some-id" });
    const res = await request(app).get("/api/users/check-username/taken_name");
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { username: "taken_name" },
      select: { id: true },
    });
  });

  it("returns 500 when database fails", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("DB connection lost"));
    const res = await request(app).get("/api/users/check-username/anyname");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to check username");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { username: "anyname" },
      select: { id: true },
    });
  });
});

// ─── GET /api/users/profile ────────────────────────────────────────

describe("GET /api/users/profile", () => {
  it("returns 401 without auth", async () => {
    asUnauthenticated();
    const res = await request(app).get("/api/users/profile");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or missing token");
  });

  it("returns profile when authenticated", async () => {
    const res = await request(app).get("/api/users/profile");
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(buyerUser.username);
    expect(res.body.profileComplete).toBe(true);
  });

  it("returns null user for new auth0Id (no profile yet)", async () => {
    asNewUser();
    const res = await request(app).get("/api/users/profile");
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
    expect(res.body.profileComplete).toBe(false);
  });
});

// ─── POST /api/users/profile ───────────────────────────────────────

describe("POST /api/users/profile", () => {
  it("creates a new profile (201)", async () => {
    asNewUser();
    prismaMock.user.findUnique.mockResolvedValue(null); // username not taken
    const newUser = { ...buyerUser, auth0Id: "auth0|newuser1", username: "new_user" };
    prismaMock.user.create.mockResolvedValue(newUser);

    const res = await request(app).post("/api/users/profile").send({
      username: "new_user",
      email: "new@test.com",
      favoritePokemon: "Pikachu",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("new_user");
    expect(res.body.profileComplete).toBe(true);
  });

  it("returns 400 if profile already exists", async () => {
    // asBuyer() sets req.user = buyerUser (profile exists)
    const res = await request(app).post("/api/users/profile").send({
      username: "new_user",
      email: "new@test.com",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Profile already exists");
  });

  it("returns 400 for too-short username", async () => {
    asNewUser();
    const res = await request(app).post("/api/users/profile").send({
      username: "ab",
      email: "new@test.com",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Username must be 3-20 characters");
  });

  it("returns 400 for username with special chars", async () => {
    asNewUser();
    const res = await request(app).post("/api/users/profile").send({
      username: "bad user!",
      email: "new@test.com",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Username can only contain letters, numbers, and underscores");
  });

  it("returns 400 for taken username", async () => {
    asNewUser();
    prismaMock.user.findUnique.mockResolvedValue(buyerUser); // username taken

    const res = await request(app).post("/api/users/profile").send({
      username: buyerUser.username,
      email: "new@test.com",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Username is already taken");
  });
});

// ─── PATCH /api/users/profile ──────────────────────────────────────

describe("PATCH /api/users/profile", () => {
  it("updates username and favoritePokemon", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null); // new username is free
    prismaMock.user.update.mockResolvedValue({
      ...buyerUser,
      username: "updated_name",
      favoritePokemon: "Eevee",
    });

    const res = await request(app).patch("/api/users/profile").send({
      username: "updated_name",
      favoritePokemon: "Eevee",
    });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("updated_name");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { username: "updated_name" },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: buyerUser.id },
      data: { username: "updated_name", favoritePokemon: "Eevee" },
    });
  });

  it("does not check username availability when username is omitted", async () => {
    prismaMock.user.update.mockResolvedValue({
      ...buyerUser,
      favoritePokemon: "Eevee",
    });

    const res = await request(app).patch("/api/users/profile").send({
      favoritePokemon: "Eevee",
    });

    expect(res.status).toBe(200);
    expect(res.body.user.favoritePokemon).toBe("Eevee");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: buyerUser.id },
      data: { favoritePokemon: "Eevee" },
    });
  });

  it("returns 403 when user has no profile", async () => {
    asNewUser();
    const res = await request(app).patch("/api/users/profile").send({
      username: "new_name",
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Profile setup required");
  });

  it("returns 400 for bad username", async () => {
    const res = await request(app).patch("/api/users/profile").send({
      username: "ab",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Username must be 3-20 characters");
  });

  it("returns 500 when database fails", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null); // username free
    prismaMock.user.update.mockRejectedValue(new Error("DB connection lost"));

    const res = await request(app).patch("/api/users/profile").send({
      username: "valid_name",
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to update profile");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: buyerUser.id },
      data: { username: "valid_name" },
    });
  });
});

// ─── POST /api/users/seller-request ────────────────────────────────

describe("POST /api/users/seller-request", () => {
  it("creates a seller request with correct payload (201)", async () => {
    prismaMock.sellerRequest.findFirst.mockResolvedValue(null);
    const newRequest = { ...pendingSellerRequest, id: "new-req-id" };
    prismaMock.sellerRequest.create.mockResolvedValue(newRequest);

    const res = await request(app)
      .post("/api/users/seller-request")
      .send({ reason: "I want to sell" });

    expect(res.status).toBe(201);
    expect(res.body.request).toBeDefined();
    expect(prismaMock.sellerRequest.create).toHaveBeenCalledWith({
      data: {
        userId: buyerUser.id,
        reason: "I want to sell",
      },
    });
  });

  it("stores null when reason is omitted", async () => {
    prismaMock.sellerRequest.findFirst.mockResolvedValue(null);
    prismaMock.sellerRequest.create.mockResolvedValue({ ...pendingSellerRequest });

    const res = await request(app)
      .post("/api/users/seller-request")
      .send({});

    expect(res.status).toBe(201);
    expect(prismaMock.sellerRequest.create).toHaveBeenCalledWith({
      data: {
        userId: buyerUser.id,
        reason: null,
      },
    });
  });

  it("treats empty-string reason as null", async () => {
    prismaMock.sellerRequest.findFirst.mockResolvedValue(null);
    prismaMock.sellerRequest.create.mockResolvedValue({ ...pendingSellerRequest });

    const res = await request(app)
      .post("/api/users/seller-request")
      .send({ reason: "" });

    expect(res.status).toBe(201);
    expect(prismaMock.sellerRequest.create).toHaveBeenCalledWith({
      data: {
        userId: buyerUser.id,
        reason: null,
      },
    });
  });

  it("returns 400 if already a seller", async () => {
    asSeller();
    const res = await request(app)
      .post("/api/users/seller-request")
      .send({ reason: "Please" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("You already have seller permissions");
  });

  it("returns 400 if pending request exists", async () => {
    prismaMock.sellerRequest.findFirst.mockResolvedValue(pendingSellerRequest);
    const res = await request(app)
      .post("/api/users/seller-request")
      .send({ reason: "Again" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("You already have a pending request");
  });
});

// ─── GET /api/users/seller-request ─────────────────────────────────

describe("GET /api/users/seller-request", () => {
  it("returns user's request history", async () => {
    prismaMock.sellerRequest.findMany.mockResolvedValue([pendingSellerRequest]);
    const res = await request(app).get("/api/users/seller-request");
    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(1);
  });

  it("returns 403 when user has no profile", async () => {
    asNewUser();
    const res = await request(app).get("/api/users/seller-request");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Profile setup required");
  });
});
