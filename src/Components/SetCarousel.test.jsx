import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SetCarousel from "./SetCarousel";
import { getFeaturedSets } from "../Services/featuredApi";

vi.mock("../Services/featuredApi", () => ({
  getFeaturedSets: vi.fn(),
}));

const MOCK_SETS = {
  lastUpdated: "2026-01-28T00:00:00.000Z",
  sets: [
    { id: "sm12", name: "Cosmic Eclipse", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/sm12-logo.png" } },
    { id: "swsh4.5", name: "Shining Fates", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/swsh4.5-logo.png" } },
    { id: "swsh7", name: "Evolving Skies", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/swsh7-logo.png" } },
    { id: "cel25", name: "Celebrations", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/cel25-logo.png" } },
    { id: "swsh9", name: "Brilliant Stars", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/swsh9-logo.png" } },
    { id: "base1", name: "Base Set", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/base1-logo.png" } },
    { id: "base2", name: "Jungle", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/base2-logo.png" } },
    { id: "base3", name: "Fossil", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/base3-logo.png" } },
  ],
};

function renderSetCarousel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <SetCarousel />
      </QueryClientProvider>
    ),
    queryClient,
  };
}

describe("SetCarousel", () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    getFeaturedSets.mockResolvedValue(MOCK_SETS);
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it("renders the section heading after data loads", async () => {
    ({ queryClient } = renderSetCarousel());

    expect(
      await screen.findByRole("heading", { name: /featured collections/i })
    ).toBeInTheDocument();
    expect(getFeaturedSets).toHaveBeenCalledOnce();
  });

  it("renders featured sets", async () => {
    ({ queryClient } = renderSetCarousel());

    // Wait for data to load using the heading as anchor
    await screen.findByRole("heading", { name: /featured collections/i });

    // Every set in the mock should have at least one logo rendered
    for (const set of MOCK_SETS.sets) {
      expect(screen.getAllByRole("img", { name: set.name }).length).toBeGreaterThanOrEqual(1);
    }

    expect(getFeaturedSets).toHaveBeenCalledOnce();
  });
});
