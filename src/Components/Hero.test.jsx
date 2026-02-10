import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Hero from "./Hero";
import { getFeaturedCards, formatPrice } from "../Services/featuredApi";

// Mock the featuredApi module
vi.mock("../Services/featuredApi", () => ({
  getFeaturedCards: vi.fn(),
  formatPrice: vi.fn((val) =>
    val == null ? "Price unavailable" : `$${val.toFixed(2)}`
  ),
}));

const MOCK_CARDS = {
  lastUpdated: "2026-01-28T00:00:00.000Z",
  cards: [
    {
      id: "base1-4",
      name: "Charizard",
      rarity: "Rare",
      set: { name: "Base Set" },
      images: { small: "https://pokeshop-card-images.s3.amazonaws.com/images/cards/charizard.png" },
      price: { value: 461.32, type: "holofoil", source: "TCGPlayer" },
    },
    {
      id: "base1-2",
      name: "Blastoise",
      rarity: "Rare",
      set: { name: "Base Set" },
      images: { small: "https://pokeshop-card-images.s3.amazonaws.com/images/cards/blastoise.png" },
      price: { value: 164.65, type: "holofoil", source: "TCGPlayer" },
    },
    {
      id: "base1-15",
      name: "Venusaur",
      rarity: "Rare",
      set: { name: "Base Set" },
      images: { small: "https://pokeshop-card-images.s3.amazonaws.com/images/cards/venusaur.png" },
      price: { value: 132.65, type: "holofoil", source: "TCGPlayer" },
    },
    {
      id: "base1-10",
      name: "Mewtwo",
      rarity: "Rare",
      set: { name: "Base Set" },
      images: { small: "https://pokeshop-card-images.s3.amazonaws.com/images/cards/mewtwo.png" },
      price: { value: 51.51, type: "holofoil", source: "TCGPlayer" },
    },
    {
      id: "base1-16",
      name: "Zapdos",
      rarity: "Rare",
      set: { name: "Base Set" },
      images: { small: "https://pokeshop-card-images.s3.amazonaws.com/images/cards/zapdos.png" },
      price: null,
    },
  ],
};

function renderHero() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Hero />
      </QueryClientProvider>
    ),
    queryClient,
  };
}

describe("Hero", () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    getFeaturedCards.mockResolvedValue(MOCK_CARDS);
  });

  afterEach(() => {
    queryClient?.clear();
    vi.useRealTimers();
  });

  it("renders one nav dot per featured card", async () => {
    ({ queryClient } = renderHero());

    await screen.findByLabelText("Go to card 1");

    const dots = screen.getAllByRole("button", { name: /Go to card/ });
    expect(dots).toHaveLength(5);
  });

  it("auto-advances the carousel every 3 seconds", async () => {
    // shouldAdvanceTime lets promises resolve while capturing setInterval
    vi.useFakeTimers({ shouldAdvanceTime: true });

    ({ queryClient } = renderHero());

    // Wait for data to load (promises still resolve thanks to shouldAdvanceTime)
    await screen.findByText("Blastoise");

    // currentIndex=0 → center card is cards[1] = Blastoise
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Blastoise"
    );

    // Advance by one 3s interval
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // currentIndex=1 → center card is cards[2] = Venusaur
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Venusaur"
    );
  });

  it("clicking a nav dot shows the correct center card", async () => {
    ({ queryClient } = renderHero());

    await screen.findByLabelText("Go to card 1");

    // Initial center card is Blastoise
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Blastoise"
    );

    // Click dot 4 → currentIndex=3 → center card is cards[4] = Zapdos
    fireEvent.click(screen.getByLabelText("Go to card 4"));

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Zapdos"
    );
  });

  it("displays price when the center card has price data", async () => {
    ({ queryClient } = renderHero());

    await screen.findByText("Blastoise");

    // Blastoise has price.value = 164.65 → mock formatPrice returns "$164.65"
    expect(formatPrice).toHaveBeenCalledWith(164.65);
    expect(screen.getByText("$164.65")).toBeInTheDocument();
    expect(screen.getByText(/Market Price/)).toBeInTheDocument();
  });

  it("hides price section when the center card has no price", async () => {
    ({ queryClient } = renderHero());

    await screen.findByLabelText("Go to card 1");

    // Navigate to Zapdos (price: null)
    fireEvent.click(screen.getByLabelText("Go to card 4"));

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Zapdos"
    );

    // Price section should not be rendered
    expect(screen.queryByText(/Market Price/)).not.toBeInTheDocument();
  });
});
