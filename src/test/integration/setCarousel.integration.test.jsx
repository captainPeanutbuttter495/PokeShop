// Integration tests for SetCarousel component — real fetch pipeline via MSW
// No vi.mock() — the real service code executes end-to-end.

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MOCK_FEATURED_SETS } from "../msw/fixtures";
import SetCarousel from "../../Components/SetCarousel";

let activeClient;

function createTestQueryClient(overrides = {}) {
  activeClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, ...overrides },
    },
  });
  return activeClient;
}

function renderSetCarousel(queryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SetCarousel />
    </QueryClientProvider>
  );
}

describe("SetCarousel (integration)", () => {
  afterEach(() => {
    server.resetHandlers();
    activeClient?.clear();
    activeClient = undefined;
  });

  it("shows loading skeletons then renders set logos on success", async () => {
    const qc = createTestQueryClient();

    renderSetCarousel(qc);

    // Loading skeletons visible initially
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(7);

    // After MSW responds, the heading and set logos appear
    expect(
      await screen.findByRole("heading", { name: /featured collections/i })
    ).toBeInTheDocument();

    for (const set of MOCK_FEATURED_SETS.sets) {
      expect(
        screen.getAllByRole("img", { name: set.name }).length
      ).toBeGreaterThanOrEqual(1);
    }

  });

  it("renders nothing on API error (silent failure)", async () => {
    server.use(
      http.get("*/api/featured-sets", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const qc = createTestQueryClient();
    const { container } = renderSetCarousel(qc);

    // SetCarousel returns null on error — wait for that final state
    await waitFor(() => {
      expect(container.querySelector("section")).toBeNull();
    });

    expect(
      screen.queryByRole("heading", { name: /featured collections/i })
    ).not.toBeInTheDocument();

  });

  it("serves cached data immediately on remount without refetching", async () => {
    const qc = createTestQueryClient({ staleTime: 1000 * 60 * 30 });

    // First mount — fetches from MSW
    const { unmount } = renderSetCarousel(qc);
    await screen.findByRole("heading", { name: /featured collections/i });
    unmount();

    // Second mount — same queryClient, data is cached and not stale
    renderSetCarousel(qc);

    // Cached content renders immediately — this is the primary assertion
    expect(
      screen.getByRole("heading", { name: /featured collections/i })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("img", { name: "Cosmic Eclipse" }).length
    ).toBeGreaterThanOrEqual(1);

  });
});
