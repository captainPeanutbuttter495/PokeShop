import "@testing-library/jest-dom";

// Bridge Vitest's timer API for React Testing Library.
// RTL's asyncWrapper calls `jest.advanceTimersByTime(0)` to flush a
// setTimeout(0) it uses to drain microtasks.  Vitest doesn't expose a
// `jest` global, so without this bridge every user-event call hangs
// under vi.useFakeTimers().
globalThis.jest = {
  advanceTimersByTime: (...args) => vi.advanceTimersByTime(...args),
};
