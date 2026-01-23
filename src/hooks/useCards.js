import { useQueries } from "@tanstack/react-query";
import { getCard } from "../services/pokemonApi";

/**
 * Custom hook to fetch multiple Pokemon cards by IDs
 * Uses React Query for caching - data persists across navigation
 * @param {string[]} cardIds - Array of card IDs to fetch
 * @returns {object} { cards, loading, error }
 */
export function useCards(cardIds) {
  const queries = useQueries({
    queries: (cardIds || []).map((id) => ({
      queryKey: ["card", id],
      queryFn: () => getCard(id),
      enabled: !!id,
      staleTime: 1000 * 60 * 30, // 30 minutes - don't refetch if we have data
      gcTime: 1000 * 60 * 60, // 1 hour cache
    })),
  });

  // React Query populates data from cache synchronously on mount
  const cards = queries.map((q) => q.data).filter(Boolean);

  // Show loading until ALL cards are ready (prevents incremental display)
  const allLoaded = cardIds?.length > 0 && cards.length === cardIds.length;
  const loading = !allLoaded && queries.some((q) => q.isLoading || q.isPending);

  const error =
    cards.length === 0 && queries.every((q) => q.isError)
      ? "Failed to load cards"
      : null;

  return { cards, loading, error };
}
