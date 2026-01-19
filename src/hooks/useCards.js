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
    })),
  });

  const loading = queries.some((q) => q.isLoading);
  const cards = queries
    .filter((q) => q.isSuccess && q.data)
    .map((q) => q.data);
  const error = queries.every((q) => q.isError) ? "Failed to load cards" : null;

  return { cards, loading, error };
}
