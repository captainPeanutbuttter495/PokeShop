import { useState, useEffect } from "react";
import { getSet } from "../services/pokemonApi";

/**
 * Custom hook to fetch multiple Pokemon sets by IDs
 * @param {string[]} setIds - Array of set IDs to fetch
 * @returns {object} { sets, loading, error }
 */
export function useSets(setIds) {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!setIds || setIds.length === 0) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchSets() {
      try {
        setLoading(true);
        setError(null);

        const setPromises = setIds.map((id) => getSet(id));
        const results = await Promise.all(setPromises);

        if (!controller.signal.aborted) {
          setSets(results);
          setLoading(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchSets();

    return () => {
      controller.abort();
    };
  }, [setIds.join(",")]);

  return { sets, loading, error };
}
