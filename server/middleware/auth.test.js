// Mock side-effect-heavy imports before they execute
vi.mock("express-jwt", () => ({
  expressjwt: vi.fn(() => vi.fn()),
}));

vi.mock("jwks-rsa", () => ({
  default: { expressJwtSecret: vi.fn(() => vi.fn()) },
}));

vi.mock("../db.js", () => ({
  default: {},
}));

import { requireRole, requireAdmin, requireSeller, requireBuyer } from "./auth.js";

// Helper to create mock Express req/res/next
function createMocks(user) {
  return {
    req: { user },
    res: {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    },
    next: vi.fn(),
  };
}

// Assert the middleware rejected with 403 + an error string, and never called next()
function expectForbidden({ res, next }) {
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ error: expect.any(String) }),
  );
  expect(next).not.toHaveBeenCalled();
}

// Assert the middleware called next() without sending a response
function expectAllowed({ res, next }) {
  expect(next).toHaveBeenCalled();
  expect(res.status).not.toHaveBeenCalled();
}

// ─── requireRole factory ────────────────────────────────────────────

describe("requireRole", () => {
  describe("when req.user is missing", () => {
    it("returns 403 when user is undefined", () => {
      const mocks = createMocks(undefined);
      requireRole("ADMIN")(mocks.req, mocks.res, mocks.next);
      expectForbidden(mocks);
    });

    it("returns 403 when user is null", () => {
      const mocks = createMocks(null);
      requireRole("ADMIN")(mocks.req, mocks.res, mocks.next);
      expectForbidden(mocks);
    });
  });

  describe("when user has wrong role", () => {
    it("rejects BUYER accessing ADMIN route", () => {
      const mocks = createMocks({ role: "BUYER" });
      requireRole("ADMIN")(mocks.req, mocks.res, mocks.next);
      expectForbidden(mocks);
    });

    it("rejects BUYER accessing SELLER route", () => {
      const mocks = createMocks({ role: "BUYER" });
      requireRole("SELLER")(mocks.req, mocks.res, mocks.next);
      expectForbidden(mocks);
    });

    it("rejects SELLER accessing ADMIN route", () => {
      const mocks = createMocks({ role: "SELLER" });
      requireRole("ADMIN")(mocks.req, mocks.res, mocks.next);
      expectForbidden(mocks);
    });
  });

  describe("when user has correct role", () => {
    it("calls next() for a matching single role", () => {
      const mocks = createMocks({ role: "ADMIN" });
      requireRole("ADMIN")(mocks.req, mocks.res, mocks.next);
      expectAllowed(mocks);
    });

    it("calls next() when role is in the allowed list", () => {
      const mocks = createMocks({ role: "SELLER" });
      requireRole("SELLER", "ADMIN")(mocks.req, mocks.res, mocks.next);
      expectAllowed(mocks);
    });
  });

  describe("edge cases", () => {
    it("rejects when no roles are specified", () => {
      const mocks = createMocks({ role: "ADMIN" });
      requireRole()(mocks.req, mocks.res, mocks.next);
      expectForbidden(mocks);
    });

    it("is case sensitive - 'admin' does not match 'ADMIN'", () => {
      const mocks = createMocks({ role: "admin" });
      requireRole("ADMIN")(mocks.req, mocks.res, mocks.next);
      expectForbidden(mocks);
    });
  });
});

// ─── requireAdmin ───────────────────────────────────────────────────

describe("requireAdmin", () => {
  it("allows ADMIN", () => {
    const mocks = createMocks({ role: "ADMIN" });
    requireAdmin(mocks.req, mocks.res, mocks.next);
    expectAllowed(mocks);
  });

  it("rejects SELLER", () => {
    const mocks = createMocks({ role: "SELLER" });
    requireAdmin(mocks.req, mocks.res, mocks.next);
    expectForbidden(mocks);
  });

  it("rejects BUYER", () => {
    const mocks = createMocks({ role: "BUYER" });
    requireAdmin(mocks.req, mocks.res, mocks.next);
    expectForbidden(mocks);
  });
});

// ─── requireSeller ──────────────────────────────────────────────────
describe("requireSeller", () => {
  it("allows SELLER", () => {
    const mocks = createMocks({ role: "SELLER" });
    requireSeller(mocks.req, mocks.res, mocks.next);
    expectAllowed(mocks);
  });

  it("allows ADMIN", () => {
    const mocks = createMocks({ role: "ADMIN" });
    requireSeller(mocks.req, mocks.res, mocks.next);
    expectAllowed(mocks);
  });

  it("rejects BUYER", () => {
    const mocks = createMocks({ role: "BUYER" });
    requireSeller(mocks.req, mocks.res, mocks.next);
    expectForbidden(mocks);
  });
});

// ─── requireBuyer ───────────────────────────────────────────────────

describe("requireBuyer", () => {
  it("allows BUYER", () => {
    const mocks = createMocks({ role: "BUYER" });
    requireBuyer(mocks.req, mocks.res, mocks.next);
    expectAllowed(mocks);
  });

  it("allows SELLER", () => {
    const mocks = createMocks({ role: "SELLER" });
    requireBuyer(mocks.req, mocks.res, mocks.next);
    expectAllowed(mocks);
  });

  it("allows ADMIN", () => {
    const mocks = createMocks({ role: "ADMIN" });
    requireBuyer(mocks.req, mocks.res, mocks.next);
    expectAllowed(mocks);
  });

  it("rejects when user has no profile", () => {
    const mocks = createMocks(null);
    requireBuyer(mocks.req, mocks.res, mocks.next);
    expectForbidden(mocks);
  });
});
