import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useUser } from "../context/UserContext";
import { createProfile, updateProfile, checkUsername, getSellerRequestStatus } from "../services/userApi";
import Profile from "./Profile";

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
}));

vi.mock("../context/UserContext", () => ({
  useUser: vi.fn(),
}));

vi.mock("../services/userApi", () => ({
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  checkUsername: vi.fn(),
  getSellerRequestStatus: vi.fn(),
  submitSellerRequest: vi.fn(),
}));

const mockGetAccessToken = vi.fn().mockResolvedValue("fake-token");
const mockUpdateProfileData = vi.fn();

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );
}

describe("Profile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    // Flush debounced checkUsername before unmount to avoid act() warnings
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("avatar selection (new profile)", () => {
    beforeEach(() => {
      useAuth0.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessToken,
        user: { name: "Ash", email: "ash@pokemon.com" },
      });
      useUser.mockReturnValue({
        profile: null,
        profileComplete: false,
        profileLoading: false,
        updateProfileData: mockUpdateProfileData,
      });
      checkUsername.mockResolvedValue({ available: true });
    });

    it("renders starter Pokemon in the dropdown", () => {
      renderProfile();

      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /select a pokemon/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Pikachu" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Charmander" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Mudkip" })).toBeInTheDocument();
    });

    it("debounces checkUsername by 500ms", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderProfile();

      await user.type(screen.getByPlaceholderText("Enter username"), "AshK");

      expect(checkUsername).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(checkUsername).toHaveBeenCalledTimes(1);
      expect(checkUsername).toHaveBeenCalledWith("AshK");
    });

    it("shows preview when a Pokemon is selected", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderProfile();

      // No preview initially
      expect(screen.queryByAltText("Selected Pokemon")).not.toBeInTheDocument();

      // Select Pikachu (id: 25)
      await user.selectOptions(screen.getByRole("combobox"), "25");

      const preview = screen.getByAltText("Selected Pokemon");
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveAttribute(
        "src",
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
      );
    });

    it("persists avatar selection via createProfile API", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      createProfile.mockResolvedValue({
        user: { username: "AshK", favoritePokemon: "25", email: "ash@pokemon.com", role: "BUYER" },
      });

      renderProfile();

      // Fill in username and flush the 500ms debounce
      await user.type(screen.getByPlaceholderText("Enter username"), "AshK");
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Select Pikachu
      await user.selectOptions(screen.getByRole("combobox"), "25");

      // Submit the form
      await user.click(screen.getByRole("button", { name: /create profile/i }));

      await waitFor(() => {
        expect(createProfile).toHaveBeenCalledWith(mockGetAccessToken, {
          username: "AshK",
          favoritePokemon: "25",
          email: "ash@pokemon.com",
        });
      });

      expect(mockUpdateProfileData).toHaveBeenCalledWith({
        username: "AshK",
        favoritePokemon: "25",
        email: "ash@pokemon.com",
        role: "BUYER",
      });
    });
  });

  describe("avatar selection (existing profile)", () => {
    beforeEach(() => {
      useAuth0.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessToken,
        user: { name: "Ash", email: "ash@pokemon.com" },
      });
      useUser.mockReturnValue({
        profile: {
          username: "AshK",
          email: "ash@pokemon.com",
          favoritePokemon: "25",
          role: "BUYER",
        },
        profileComplete: true,
        profileLoading: false,
        updateProfileData: mockUpdateProfileData,
      });
      checkUsername.mockResolvedValue({ available: true });
      getSellerRequestStatus.mockResolvedValue({ requests: [] });
    });

    it("shows current avatar on profile view", () => {
      renderProfile();

      const avatar = screen.getByAltText("Profile");
      expect(avatar).toHaveAttribute(
        "src",
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
      );
    });

    it("persists avatar change via updateProfile API", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      updateProfile.mockResolvedValue({
        user: { username: "AshK", favoritePokemon: "4", email: "ash@pokemon.com", role: "BUYER" },
      });

      renderProfile();

      // Enter edit mode
      await user.click(screen.getByRole("button", { name: /edit profile/i }));

      // Change avatar to Charmander (id: 4)
      await user.selectOptions(screen.getByRole("combobox"), "4");

      // Preview should update
      const preview = screen.getByAltText("Selected Pokemon");
      expect(preview).toHaveAttribute(
        "src",
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png"
      );

      // Save
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith(mockGetAccessToken, {
          username: "AshK",
          favoritePokemon: "4",
        });
      });

      expect(mockUpdateProfileData).toHaveBeenCalledWith({
        username: "AshK",
        favoritePokemon: "4",
        email: "ash@pokemon.com",
        role: "BUYER",
      });
    });
  });
});
