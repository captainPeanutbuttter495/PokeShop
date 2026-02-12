import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import AdminDashboard from "./AdminDashboard";
import {
  getProfile,
  getSellerRequests,
  getAllUsers,
} from "../services/userApi";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../services/userApi", () => ({
  getProfile: vi.fn(),
  getSellerRequests: vi.fn(),
  approveSellerRequest: vi.fn(),
  rejectSellerRequest: vi.fn(),
  getAllUsers: vi.fn(),
  deactivateUser: vi.fn(),
  reactivateUser: vi.fn(),
  changeUserRole: vi.fn(),
}));

vi.mock("@iconify/react", () => ({
  Icon: (props) => <span data-testid={`icon-${props.icon}`} />,
}));

// ── Fixtures ─────────────────────────────────────────────────────────

const ADMIN_PROFILE = {
  user: {
    id: "admin-1",
    role: "ADMIN",
    username: "AdminUser",
    email: "admin@pokeshop.com",
  },
};

const MOCK_REQUESTS = [
  {
    id: "req-1",
    status: "PENDING",
    reason: "I want to sell cards",
    createdAt: "2025-06-01T00:00:00Z",
    user: { username: "BuyerBob", email: "bob@pokeshop.com", favoritePokemon: null },
  },
  {
    id: "req-2",
    status: "APPROVED",
    reason: null,
    createdAt: "2025-05-15T00:00:00Z",
    user: { username: "SellerSam", email: "sam@pokeshop.com", favoritePokemon: "25" },
  },
];

const MOCK_USERS = [
  {
    id: "admin-1",
    username: "AdminUser",
    email: "admin@pokeshop.com",
    role: "ADMIN",
    isActive: true,
    favoritePokemon: null,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "user-2",
    username: "BuyerBob",
    email: "bob@pokeshop.com",
    role: "BUYER",
    isActive: true,
    favoritePokemon: null,
    createdAt: "2025-03-01T00:00:00Z",
  },
  {
    id: "user-3",
    username: "SellerSam",
    email: "sam@pokeshop.com",
    role: "SELLER",
    isActive: false,
    favoritePokemon: "25",
    createdAt: "2025-02-01T00:00:00Z",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

const mockGetAccessToken = vi.fn();

function renderAdminDashboard() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );
}

function setAuth({ isAuthenticated = false, isLoading = false } = {}) {
  useAuth0.mockReturnValue({
    isAuthenticated,
    isLoading,
    getAccessTokenSilently: mockGetAccessToken,
  });
}

// ── Tests ────────────────────────────────────────────────────────────

describe("AdminDashboard", () => {
  afterEach(() => {
    mockNavigate.mockReset();
    vi.clearAllMocks();
  });

  // ── RBAC — access denied ─────────────────────────────────────────

  describe("RBAC — access denied", () => {
    it("redirects unauthenticated users to / without calling any API", async () => {
      setAuth({ isAuthenticated: false });

      renderAdminDashboard();

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
      expect(getProfile).not.toHaveBeenCalled();
      expect(getSellerRequests).not.toHaveBeenCalled();
      expect(getAllUsers).not.toHaveBeenCalled();
    });

    it.each([["BUYER"], ["SELLER"]])(
      "redirects %s role to /profile",
      async (role) => {
        setAuth({ isAuthenticated: true });
        getProfile.mockResolvedValue({ user: { id: "u-1", role } });

        const requestsBefore = getSellerRequests.mock.calls.length;
        const usersBefore = getAllUsers.mock.calls.length;

        renderAdminDashboard();

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile"));
        expect(getSellerRequests.mock.calls.length).toBe(requestsBefore);
        expect(getAllUsers.mock.calls.length).toBe(usersBefore);
      },
    );

    it("redirects to / when getProfile throws", async () => {
      setAuth({ isAuthenticated: true });
      getProfile.mockRejectedValue(new Error("Network error"));

      renderAdminDashboard();

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    });
  });

  // ── Admin — Seller Requests tab ──────────────────────────────────

  describe("Admin — Seller Requests tab", () => {
    beforeEach(() => {
      setAuth({ isAuthenticated: true });
      getProfile.mockResolvedValue(ADMIN_PROFILE);
      getSellerRequests.mockResolvedValue({ requests: MOCK_REQUESTS });
    });

    it("renders requests with correct controls", async () => {
      renderAdminDashboard();

      // Wait for data to load
      await screen.findByText("BuyerBob");

      // API was called with the correct token getter
      expect(getSellerRequests).toHaveBeenCalled();
      expect(getSellerRequests.mock.calls.at(-1)[0]).toBe(mockGetAccessToken);

      // Pending request (BuyerBob) shows action buttons
      const bobCard = screen.getByText("BuyerBob").closest("[class*='items-center justify-between']");
      expect(within(bobCard).getByRole("button", { name: "Approve" })).toBeInTheDocument();
      expect(within(bobCard).getByRole("button", { name: "Reject" })).toBeInTheDocument();

      // Approved request (SellerSam) shows status badge, no action buttons
      const samCard = screen.getByText("SellerSam").closest("[class*='items-center justify-between']");
      expect(within(samCard).getByText("APPROVED")).toBeInTheDocument();
      expect(within(samCard).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();

      // Reason text is visible
      expect(screen.getByText(/I want to sell cards/)).toBeInTheDocument();
    });

    it("status filter triggers new API call with correct param", async () => {
      renderAdminDashboard();

      await screen.findByText("BuyerBob");
      const callsBefore = getSellerRequests.mock.calls.length;

      // Click the "APPROVED" filter button
      fireEvent.click(screen.getByRole("button", { name: "APPROVED" }));

      await waitFor(() => expect(getSellerRequests.mock.calls.length).toBeGreaterThan(callsBefore));
      expect(getSellerRequests.mock.calls.at(-1)[1]).toBe("APPROVED");
    });
  });

  // ── Admin — All Users tab ────────────────────────────────────────

  describe("Admin — All Users tab", () => {
    beforeEach(() => {
      setAuth({ isAuthenticated: true });
      getProfile.mockResolvedValue(ADMIN_PROFILE);
      getSellerRequests.mockResolvedValue({ requests: [] });
      getAllUsers.mockResolvedValue({ users: MOCK_USERS });
    });

    it("renders user rows with correct controls", async () => {
      renderAdminDashboard();

      // Wait for admin check to complete (loading spinner disappears)
      await screen.findByText("Admin Dashboard");

      // Switch to users tab
      fireEvent.click(screen.getByRole("button", { name: /all users/i }));

      // Tab click triggered fetch
      await waitFor(() => expect(getAllUsers).toHaveBeenCalled());

      // Wait for the table to appear
      await screen.findByRole("table");

      // Admin's own row shows "(You)" badge and no role combobox
      const adminRow = screen.getByText("AdminUser").closest("tr");
      expect(within(adminRow).getByText(/ADMIN \(You\)/)).toBeInTheDocument();
      expect(within(adminRow).queryByRole("combobox")).not.toBeInTheDocument();

      // Non-admin users have role dropdowns
      const bobRow = screen.getByText("BuyerBob").closest("tr");
      expect(within(bobRow).getByRole("combobox")).toBeInTheDocument();

      const samRow = screen.getByText("SellerSam").closest("tr");
      expect(within(samRow).getByRole("combobox")).toBeInTheDocument();

      // BuyerBob (active, non-admin) has Deactivate button
      expect(within(bobRow).getByRole("button", { name: /deactivate/i })).toBeInTheDocument();

      // SellerSam (deactivated, non-admin) has Reactivate button
      expect(within(samRow).getByRole("button", { name: /reactivate/i })).toBeInTheDocument();
    });
  });

  // ── Error handling ───────────────────────────────────────────────

  describe("Error handling", () => {
    it("shows error message when requests fetch fails", async () => {
      setAuth({ isAuthenticated: true });
      getProfile.mockResolvedValue(ADMIN_PROFILE);
      getSellerRequests.mockRejectedValue(new Error("Server unavailable"));

      renderAdminDashboard();

      await screen.findByText("Server unavailable");
    });
  });
});
