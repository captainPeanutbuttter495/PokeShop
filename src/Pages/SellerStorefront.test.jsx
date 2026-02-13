import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useUser } from "../context/UserContext";
import { useCart } from "../context/CartContext";
import { getSellerByUsername } from "../services/userApi";
import SellerStorefront from "./SellerStorefront";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
}));

vi.mock("../context/UserContext", () => ({
  useUser: vi.fn(),
}));

vi.mock("../context/CartContext", () => ({
  useCart: vi.fn(),
}));

vi.mock("../services/userApi", () => ({
  getSellerByUsername: vi.fn(),
}));

vi.mock("@iconify/react", () => ({
  Icon: (props) => <span data-testid={`icon-${props.icon}`} />,
}));

// ── Fixtures ─────────────────────────────────────────────────────────

const SELLER_WITH_LISTINGS = {
  seller: {
    id: "seller-1",
    username: "PokeMaster",
    createdAt: "2025-01-15T00:00:00Z",
    favoritePokemon: null,
    cardListings: [
      {
        id: "listing-1",
        cardName: "Charizard VMAX",
        setName: "Darkness Ablaze",
        price: 89.99,
        imageUrl: "https://example.com/charizard.png",
        createdAt: "2025-06-01T00:00:00Z",
      },
      {
        id: "listing-2",
        cardName: "Pikachu V",
        setName: "Vivid Voltage",
        price: 12.5,
        imageUrl: "https://example.com/pikachu.png",
        createdAt: "2025-06-02T00:00:00Z",
      },
    ],
  },
};

const SELLER_ONE_LISTING = {
  seller: {
    id: "seller-2",
    username: "SingleSeller",
    createdAt: "2025-03-01T00:00:00Z",
    favoritePokemon: null,
    cardListings: [
      {
        id: "listing-3",
        cardName: "Mewtwo EX",
        setName: "Scarlet & Violet",
        price: 25.0,
        imageUrl: null,
        createdAt: "2025-06-03T00:00:00Z",
      },
    ],
  },
};

const SELLER_EMPTY = {
  seller: {
    id: "seller-3",
    username: "EmptySeller",
    createdAt: "2025-04-01T00:00:00Z",
    favoritePokemon: null,
    cardListings: [],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

function renderStorefront(username = "PokeMaster") {
  return render(
    <MemoryRouter initialEntries={[`/seller/${username}`]}>
      <Routes>
        <Route path="/seller/:username" element={<SellerStorefront />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────

describe("SellerStorefront", () => {
  beforeEach(() => {
    useAuth0.mockReturnValue({
      isAuthenticated: false,
      loginWithRedirect: vi.fn(),
    });
    useUser.mockReturnValue({ profile: null });
    useCart.mockReturnValue({ addToCart: vi.fn(), isInCart: vi.fn(() => false) });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading state ────────────────────────────────────────────────

  it("shows loading spinner before fetch resolves", () => {
    getSellerByUsername.mockReturnValue(new Promise(() => {}));

    renderStorefront();

    expect(screen.getByTestId("icon-mdi:loading")).toBeInTheDocument();
  });

  // ── Error state ──────────────────────────────────────────────────

  it("shows error UI with link back to shop when fetch fails", async () => {
    getSellerByUsername.mockRejectedValue(new Error("Seller not found"));

    renderStorefront();

    expect(await screen.findByText("Seller Not Found")).toBeInTheDocument();
    expect(screen.getByText("Seller not found")).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: /back to shop/i });
    expect(backLink).toHaveAttribute("href", "/shop");
  });

  // ── Success — multiple listings ──────────────────────────────────

  it("renders seller info and plural listing count for 2 listings", async () => {
    getSellerByUsername.mockResolvedValue(SELLER_WITH_LISTINGS);

    renderStorefront();

    expect(await screen.findByText("PokeMaster")).toBeInTheDocument();
    expect(screen.getByText(/Member since/)).toBeInTheDocument();
    expect(screen.getByText(/2 active listings/)).toBeInTheDocument();
    expect(screen.getByText("Charizard VMAX")).toBeInTheDocument();
    expect(screen.getByText("Pikachu V")).toBeInTheDocument();
  });

  // ── Success — singular listing ───────────────────────────────────

  it("renders singular listing count for 1 listing", async () => {
    getSellerByUsername.mockResolvedValue(SELLER_ONE_LISTING);

    renderStorefront("SingleSeller");

    expect(await screen.findByText("SingleSeller")).toBeInTheDocument();
    expect(screen.getByText(/1 active listing\b/)).toBeInTheDocument();
  });

  // ── Success — empty listings ─────────────────────────────────────

  it("renders empty state when seller has no listings", async () => {
    getSellerByUsername.mockResolvedValue(SELLER_EMPTY);

    renderStorefront("EmptySeller");

    expect(await screen.findByText("No cards available right now")).toBeInTheDocument();
    expect(screen.getByText("Check back later for new listings!")).toBeInTheDocument();
  });

  // ── Listing CTA branching ──────────────────────────────────────

  describe("Listing CTA branching", () => {
    it('shows "Your listing" when the viewer owns the store', async () => {
      useUser.mockReturnValue({ profile: { id: "seller-1" } });
      getSellerByUsername.mockResolvedValue(SELLER_WITH_LISTINGS);

      renderStorefront();

      await screen.findByText("Charizard VMAX");

      const labels = screen.getAllByText("Your listing");
      expect(labels).toHaveLength(2);
    });

    it('shows "In Cart - View" link to /cart when listing is already in cart', async () => {
      useCart.mockReturnValue({ addToCart: vi.fn(), isInCart: vi.fn(() => true) });
      getSellerByUsername.mockResolvedValue(SELLER_WITH_LISTINGS);

      renderStorefront();

      await screen.findByText("Charizard VMAX");

      const cartLinks = screen.getAllByRole("link", { name: /in cart - view/i });
      expect(cartLinks).toHaveLength(2);
      expect(cartLinks[0]).toHaveAttribute("href", "/cart");
      expect(cartLinks[1]).toHaveAttribute("href", "/cart");
    });

    it('shows "Login to Add to Cart" when user is not authenticated', async () => {
      useAuth0.mockReturnValue({
        isAuthenticated: false,
        loginWithRedirect: vi.fn(),
      });
      getSellerByUsername.mockResolvedValue(SELLER_WITH_LISTINGS);

      renderStorefront();

      await screen.findByText("Charizard VMAX");

      const buttons = screen.getAllByRole("button", { name: /login to add to cart/i });
      expect(buttons).toHaveLength(2);
    });

    it('shows "Add to Cart" when user is authenticated and listing is not in cart', async () => {
      useAuth0.mockReturnValue({
        isAuthenticated: true,
        loginWithRedirect: vi.fn(),
      });
      getSellerByUsername.mockResolvedValue(SELLER_WITH_LISTINGS);

      renderStorefront();

      await screen.findByText("Charizard VMAX");

      const buttons = screen.getAllByRole("button", { name: /add to cart/i });
      expect(buttons).toHaveLength(2);
    });
  });

  // ── Add to cart interaction + toasts ────────────────────────────

  describe("Add to cart interaction", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("calls loginWithRedirect without calling addToCart when not authenticated", async () => {
      const mockLogin = vi.fn();
      const mockAddToCart = vi.fn();
      useAuth0.mockReturnValue({ isAuthenticated: false, loginWithRedirect: mockLogin });
      useCart.mockReturnValue({ addToCart: mockAddToCart, isInCart: vi.fn(() => false) });
      getSellerByUsername.mockResolvedValue(SELLER_WITH_LISTINGS);

      const user = userEvent.setup();
      renderStorefront();
      await screen.findByText("Charizard VMAX");

      await user.click(screen.getAllByRole("button", { name: /login to add to cart/i })[0]);

      expect(mockLogin).toHaveBeenCalledOnce();
      expect(mockAddToCart).not.toHaveBeenCalled();
    });

    it('disables button and shows "Adding…" then success toast on add', async () => {
      let resolveAdd;
      const mockAddToCart = vi.fn(() => new Promise((r) => { resolveAdd = r; }));
      useAuth0.mockReturnValue({ isAuthenticated: true, loginWithRedirect: vi.fn() });
      useCart.mockReturnValue({ addToCart: mockAddToCart, isInCart: vi.fn(() => false) });
      getSellerByUsername.mockResolvedValue(SELLER_WITH_LISTINGS);

      const user = userEvent.setup();
      renderStorefront();
      await screen.findByText("Charizard VMAX");

      const button = screen.getAllByRole("button", { name: /add to cart/i })[0];
      await user.click(button);

      // While addToCart is pending: button disabled, "Adding..." visible
      expect(button).toBeDisabled();
      expect(screen.getByText("Adding...")).toBeInTheDocument();

      // Resolve → success toast appears
      resolveAdd();
      expect(await screen.findByText("Charizard VMAX added to cart!")).toBeInTheDocument();
    });

    it("auto-dismisses success toast after 3 seconds", async () => {
      vi.useFakeTimers();
      const mockAddToCart = vi.fn().mockResolvedValue();
      useAuth0.mockReturnValue({ isAuthenticated: true, loginWithRedirect: vi.fn() });
      useCart.mockReturnValue({ addToCart: mockAddToCart, isInCart: vi.fn(() => false) });
      getSellerByUsername.mockResolvedValue(SELLER_WITH_LISTINGS);

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderStorefront();
      await screen.findByText("Charizard VMAX");

      await user.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
      expect(await screen.findByText("Charizard VMAX added to cart!")).toBeInTheDocument();

      // Advance past the 3-second auto-dismiss timeout
      await act(() => { vi.advanceTimersByTime(3000); });

      expect(screen.queryByText("Charizard VMAX added to cart!")).not.toBeInTheDocument();
    });

    it("shows error toast on failure and close button dismisses it", async () => {
      const mockAddToCart = vi.fn().mockRejectedValue(new Error("Out of stock"));
      useAuth0.mockReturnValue({ isAuthenticated: true, loginWithRedirect: vi.fn() });
      useCart.mockReturnValue({ addToCart: mockAddToCart, isInCart: vi.fn(() => false) });
      getSellerByUsername.mockResolvedValue(SELLER_WITH_LISTINGS);

      const user = userEvent.setup();
      renderStorefront();
      await screen.findByText("Charizard VMAX");

      await user.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
      expect(await screen.findByText("Out of stock")).toBeInTheDocument();

      // Close button dismisses the error toast
      await user.click(screen.getByTestId("icon-mdi:close").closest("button"));
      expect(screen.queryByText("Out of stock")).not.toBeInTheDocument();
    });
  });
});
