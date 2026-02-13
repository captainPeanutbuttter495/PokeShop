import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import SellerDashboard from "./SellerDashboard";
import { getProfile } from "../services/userApi";
import { getMyListings } from "../services/sellerApi";

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

// ── Fixtures ─────────────────────────────────────────────────────────

const SELLER_PROFILE = {
  user: { id: "seller-1", role: "SELLER", username: "SellerSam" },
};

const MOCK_LISTINGS = [
  {
    id: "listing-1",
    cardName: "Charizard VMAX",
    setName: "Darkness Ablaze",
    price: 24.99,
    status: "ACTIVE",
    imageUrl: null,
    createdAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "listing-2",
    cardName: "Pikachu V",
    setName: "Vivid Voltage",
    price: 9.5,
    status: "SOLD",
    imageUrl: null,
    createdAt: "2025-05-15T00:00:00Z",
  },
];

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

  // ── Listings fetch + status filtering ─────────────────────────────

  describe("Listings fetch + status filtering", () => {
    beforeEach(() => {
      setAuth({ isAuthenticated: true });
      getProfile.mockResolvedValue(SELLER_PROFILE);
    });

    it("renders listing cards after SELLER profile loads", async () => {
      getMyListings.mockResolvedValue({ listings: MOCK_LISTINGS });

      renderSellerDashboard();

      // Wait for a listing card to appear
      await screen.findByText("Charizard VMAX");

      // First listing details
      expect(screen.getByText("Darkness Ablaze")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
      expect(screen.getByText("$24.99")).toBeInTheDocument();

      // Second listing details
      expect(screen.getByText("Pikachu V")).toBeInTheDocument();
      expect(screen.getByText("Vivid Voltage")).toBeInTheDocument();
      expect(screen.getByText("SOLD")).toBeInTheDocument();
      expect(screen.getByText("$9.50")).toBeInTheDocument();
    });

    it("clicking filter tab calls getMyListings with status", async () => {
      getMyListings.mockResolvedValue({ listings: MOCK_LISTINGS });
      const user = userEvent.setup();

      renderSellerDashboard();

      // Wait for initial load then clear the initial call
      await screen.findByText("Charizard VMAX");
      getMyListings.mockClear();

      // Click the "Sold" filter tab
      await user.click(screen.getByRole("button", { name: /^Sold/ }));

      await waitFor(() =>
        expect(getMyListings).toHaveBeenCalledWith(mockGetAccessToken, "SOLD"),
      );
    });

    it("empty listings show CTA that opens create modal", async () => {
      getMyListings.mockResolvedValue({ listings: [] });
      const user = userEvent.setup();

      renderSellerDashboard();

      await screen.findByText("No listings found.");
      const cta = screen.getByRole("button", { name: /create your first listing/i });
      expect(cta).toBeInTheDocument();

      await user.click(cta);

      expect(
        screen.getByRole("heading", { name: /create new listing/i }),
      ).toBeInTheDocument();
    });
  });
});
