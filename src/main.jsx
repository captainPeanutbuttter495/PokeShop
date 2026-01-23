import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";

// Simple localStorage cache functions
const CACHE_KEY = "pokeshop-query-cache";

function loadCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Only use cache if less than 1 hour old
      if (Date.now() - timestamp < 1000 * 60 * 60) {
        return data;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return undefined;
}

function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: cache,
      timestamp: Date.now(),
    }));
  } catch (e) {
    // Ignore errors (quota exceeded, etc.)
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 minutes - data stays fresh, no refetch
      gcTime: 1000 * 60 * 60, // 1 hour - cache persists
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch when component remounts
      refetchOnReconnect: false, // Don't refetch on reconnect
    },
  },
});

// Restore cache from localStorage on startup
const cachedState = loadCache();
if (cachedState) {
  // Restore Hero cards
  queryClient.setQueryData(["card", "base1-4"], cachedState["card:base1-4"]);
  queryClient.setQueryData(["card", "base1-2"], cachedState["card:base1-2"]);
  queryClient.setQueryData(["card", "base1-15"], cachedState["card:base1-15"]);
  queryClient.setQueryData(["card", "base1-10"], cachedState["card:base1-10"]);
  queryClient.setQueryData(["card", "base1-16"], cachedState["card:base1-16"]);

  // Restore SetCarousel sets
  queryClient.setQueryData(["set", "sm12"], cachedState["set:sm12"]);
  queryClient.setQueryData(["set", "swsh45"], cachedState["set:swsh45"]);
  queryClient.setQueryData(["set", "swsh7"], cachedState["set:swsh7"]);
  queryClient.setQueryData(["set", "cel25"], cachedState["set:cel25"]);
  queryClient.setQueryData(["set", "swsh9"], cachedState["set:swsh9"]);
  queryClient.setQueryData(["set", "sv3pt5"], cachedState["set:sv3pt5"]);
  queryClient.setQueryData(["set", "sv8pt5"], cachedState["set:sv8pt5"]);
}

// Save cache to localStorage periodically
setInterval(() => {
  const cache = queryClient.getQueryCache().getAll();
  const cacheData = {};
  cache.forEach((query) => {
    if (query.state.data) {
      cacheData[query.queryKey.join(":")] = query.state.data;
    }
  });
  saveCache(cacheData);
}, 5000);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
