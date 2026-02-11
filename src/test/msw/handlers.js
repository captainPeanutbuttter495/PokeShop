// Default happy-path MSW handlers for integration tests
import { http, HttpResponse } from "msw";
import { MOCK_FEATURED_CARDS, MOCK_FEATURED_SETS } from "./fixtures";

export const handlers = [
  http.get("*/api/featured-cards", () => {
    return HttpResponse.json(MOCK_FEATURED_CARDS);
  }),

  http.get("*/api/featured-sets", () => {
    return HttpResponse.json(MOCK_FEATURED_SETS);
  }),
];
