import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import SellerDashboard from "./SellerDashboard";
import { getProfile } from "../services/userApi";

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
}));

vi.mock("../services/sellerApi", () => ({
  getMyListings: vi.fn(),
  createListing: vi.fn(),
  updateListing: vi.fn(),
  deleteListing: vi.fn(),
}));

vi.mock("@iconify/react", () => ({
  Icon: (props) => <span data-testid={`icon-${props.icon}`} />,
}));

// ── Helpers ──────────────────────────────────────────────────────────

const mockGetAccessToken = vi.fn();

function renderSellerDashboard() {
  return render(
    <MemoryRouter>
      <SellerDashboard />
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

describe("SellerDashboard", () => {
  afterEach(() => {
    mockNavigate.mockReset();
    vi.clearAllMocks();
  });

  // ── RBAC — access denied ─────────────────────────────────────────

  describe("RBAC -- access denied", () => {
    it("shows spinner while auth is loading", () => {
      setAuth({ isLoading: true });

      renderSellerDashboard();

      expect(screen.getByTestId("icon-mdi:loading")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(getProfile).not.toHaveBeenCalled();
    });

    it("redirects unauthenticated users to /", async () => {
      setAuth({ isAuthenticated: false });

      renderSellerDashboard();

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
      expect(getProfile).not.toHaveBeenCalled();
    });

    it("redirects BUYER role to /profile", async () => {
      setAuth({ isAuthenticated: true });
      getProfile.mockResolvedValue({ user: { role: "BUYER" } });

      renderSellerDashboard();

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile"));
    });

    it("redirects to / when getProfile throws", async () => {
      setAuth({ isAuthenticated: true });
      getProfile.mockRejectedValue(new Error("Network error"));

      renderSellerDashboard();

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    });
  });
});
