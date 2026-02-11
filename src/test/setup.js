import "@testing-library/jest-dom";
import { server } from "./msw/server";

// Bridge Vitest's timer API for React Testing Library.
// RTL's asyncWrapper calls `jest.advanceTimersByTime(0)` to flush a
// setTimeout(0) it uses to drain microtasks.  Vitest doesn't expose a
// `jest` global, so without this bridge every user-event call hangs
// under vi.useFakeTimers().
globalThis.jest = {
  advanceTimersByTime: (...args) => vi.advanceTimersByTime(...args),
};

// MSW lifecycle — intercepts fetch at the network level for integration tests.
// Unit tests using vi.mock() are unaffected (they never reach real fetch).
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
