import { useQueries } from "@tanstack/react-query";
import { getSet } from "../services/pokemonApi";

/**
 * Custom hook to fetch multiple Pokemon sets by IDs
 * Uses React Query for caching - data persists across navigation
 * @param {string[]} setIds - Array of set IDs to fetch
 * @returns {object} { sets, loading, error }
 */
export function useSets(setIds) {
  const queries = useQueries({
    queries: (setIds || []).map((id) => ({
      queryKey: ["set", id],
      queryFn: () => getSet(id),
      enabled: !!id,
    })),
  });

  const loading = queries.some((q) => q.isLoading);
  const sets = queries
    .filter((q) => q.isSuccess && q.data)
    .map((q) => q.data);
  const error = queries.every((q) => q.isError) ? "Failed to load sets" : null;

  return { sets, loading, error };
}
