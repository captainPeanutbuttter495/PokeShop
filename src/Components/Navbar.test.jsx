import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useUser } from "../context/UserContext";
import Navbar from "./Navbar";

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
}));

vi.mock("../context/UserContext", () => ({
  useUser: vi.fn(),
}));

vi.mock("./CartIcon", () => ({
  default: () => <div data-testid="cart-icon" />,
}));

const mockLoginWithRedirect = vi.fn();
const mockLogout = vi.fn();

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );
}


describe("Navbar", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("loading", () => {
    beforeEach(() => {
      useAuth0.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        loginWithRedirect: mockLoginWithRedirect,
        logout: mockLogout,
        user: null,
      });
      useUser.mockReturnValue({
        profile: null,
        profileLoading: false,
      });
    });

    it("shows no Sign In or user menu while auth is loading", () => {
      renderNavbar();

      expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
    });
  });

  describe("logged out", () => {
    beforeEach(() => {
      useAuth0.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        loginWithRedirect: mockLoginWithRedirect,
        logout: mockLogout,
        user: null,
      });
      useUser.mockReturnValue({
        profile: null,
        profileLoading: false,
      });
    });

    it("shows Sign In button", () => {
      renderNavbar();

      const signInButtons = screen.getAllByRole("button", { name: /sign in/i });
      expect(signInButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("Sign In triggers loginWithRedirect", () => {
      renderNavbar();

      fireEvent.click(screen.getAllByRole("button", { name: /sign in/i })[0]);

      expect(mockLoginWithRedirect).toHaveBeenCalledOnce();
    });

    it("does not show Sign Out or Profile links", () => {
      renderNavbar();

      expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
      expect(screen.queryByText("Profile")).not.toBeInTheDocument();
    });
  });

  describe("logged in", () => {
    beforeEach(() => {
      useAuth0.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        loginWithRedirect: mockLoginWithRedirect,
        logout: mockLogout,
        user: { name: "Ash Ketchum", email: "ash@pokemon.com", picture: null },
      });
      useUser.mockReturnValue({
        profile: {
          username: "AshK",
          role: "BUYER",
          favoritePokemon: "25",
        },
        profileLoading: false,
      });
    });

    it("shows user avatar instead of Sign In", () => {
      renderNavbar();

      expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
      expect(screen.getAllByAltText("AshK").length).toBeGreaterThanOrEqual(1);
    });

    it("mobile menu reveals Profile and Sign Out on click", () => {
      renderNavbar();

      // Mobile menu content is not rendered yet
      // (desktop dropdown has these in DOM via CSS-hover, but mobile is conditional)
      const signOutButtonsBefore = screen.getAllByRole("button", { name: /sign out/i });

      // Open mobile menu
      fireEvent.click(screen.getByRole("button", { name: /toggle menu/i }));

      // A new Sign Out button appeared (mobile menu)
      const signOutButtonsAfter = screen.getAllByRole("button", { name: /sign out/i });
      expect(signOutButtonsAfter.length).toBe(signOutButtonsBefore.length + 1);
    });

    it("Sign Out triggers logout", () => {
      renderNavbar();

      fireEvent.click(screen.getAllByRole("button", { name: /sign out/i })[0]);

      expect(mockLogout).toHaveBeenCalledOnce();
    });
  });
});
