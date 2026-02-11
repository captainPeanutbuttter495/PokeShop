// Integration tests for Hero component — real fetch pipeline via MSW
// Component -> React Query -> featuredApi.js -> fetch() -> MSW -> back up
// No vi.mock() — the real service code executes end-to-end.

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MOCK_FEATURED_CARDS } from "../msw/fixtures";
import Hero from "../../Components/Hero";

let activeClient;

function createTestQueryClient(overrides = {}) {
  activeClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, ...overrides },
    },
  });
  return activeClient;
}

function renderHero(queryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <Hero />
    </QueryClientProvider>
  );
}

describe("Hero (integration)", () => {
  afterEach(() => {
    server.resetHandlers();
    activeClient?.clear();
    activeClient = undefined;
  });

  it("shows loading skeletons then renders cards on success", async () => {
    const qc = createTestQueryClient();

    renderHero(qc);

    // Loading skeletons are visible initially (3 pulse divs)
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);

    // After MSW responds, the center card (Blastoise at index 1) appears
    expect(await screen.findByText("Blastoise")).toBeInTheDocument();
    expect(screen.getByText("Base Set · Rare")).toBeInTheDocument();

    // Nav dots rendered (one per card)
    const dots = screen.getAllByRole("button", { name: /Go to card/ });
    expect(dots).toHaveLength(MOCK_FEATURED_CARDS.cards.length);

  });

  it("displays error message when API returns 500", async () => {
    server.use(
      http.get("*/api/featured-cards", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const qc = createTestQueryClient();
    renderHero(qc);

    expect(
      await screen.findByText("Failed to load featured cards")
    ).toBeInTheDocument();

    // The error.message from featuredApi.js includes the status code
    expect(
      screen.getByText("Failed to fetch featured cards: 500")
    ).toBeInTheDocument();

  });

  it("serves cached data immediately on remount without refetching", async () => {
    const qc = createTestQueryClient({ staleTime: 1000 * 60 * 30 });

    // First mount — fetches from MSW
    const { unmount } = renderHero(qc);
    await screen.findByText("Blastoise");
    unmount();

    // Second mount — same queryClient, data is cached and not stale
    renderHero(qc);

    // No loading skeleton — cache hit, not a fresh fetch
    expect(document.querySelector(".animate-pulse")).toBeNull();

    // Cached content renders immediately
    expect(screen.getByText("Blastoise")).toBeInTheDocument();

  });

  it("shows error UI on 504 timeout, not infinite spinner", async () => {
    server.use(
      http.get("*/api/featured-cards", () => {
        return new HttpResponse(null, { status: 504 });
      })
    );

    const qc = createTestQueryClient();
    renderHero(qc);

    expect(
      await screen.findByText("Failed to load featured cards")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Failed to fetch featured cards: 504")
    ).toBeInTheDocument();

    // Loading skeletons should be gone
    expect(document.querySelector(".animate-pulse")).toBeNull();

  });

  it("retries on intermittent 503 failures and renders on success", async () => {
    let callCount = 0;

    server.use(
      http.get("*/api/featured-cards", () => {
        callCount++;
        if (callCount <= 2) {
          return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json(MOCK_FEATURED_CARDS);
      })
    );

    // Enable retries for this test — retry 3 times with short delay
    const qc = createTestQueryClient({ retry: 3, retryDelay: 0 });
    renderHero(qc);

    // Should eventually succeed after retries
    expect(await screen.findByText("Blastoise")).toBeInTheDocument();

    // Wait for callCount to settle — avoids race if React Query
    // hasn't finished incrementing by the time findByText resolves
    await waitFor(() => {
      expect(callCount).toBe(3); // 2 failures + 1 success
    });

  });

  it("shows error UI when network fails (fetch throws)", async () => {
    server.use(
      http.get("*/api/featured-cards", () => {
        return HttpResponse.error();
      })
    );

    const qc = createTestQueryClient();
    renderHero(qc);

    expect(
      await screen.findByText("Failed to load featured cards")
    ).toBeInTheDocument();

  });
});
