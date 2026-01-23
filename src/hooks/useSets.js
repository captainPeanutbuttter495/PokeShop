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
      staleTime: 1000 * 60 * 30, // 30 minutes - don't refetch if we have data
      gcTime: 1000 * 60 * 60, // 1 hour cache
    })),
  });

  // React Query populates data from cache synchronously on mount
  const sets = queries.map((q) => q.data).filter(Boolean);

  // Show loading until ALL sets are ready (prevents incremental display)
  const allLoaded = setIds?.length > 0 && sets.length === setIds.length;
  const loading = !allLoaded && queries.some((q) => q.isLoading || q.isPending);

  const error =
    sets.length === 0 && queries.every((q) => q.isError)
      ? "Failed to load sets"
      : null;

  return { sets, loading, error };
}
