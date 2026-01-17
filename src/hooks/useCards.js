import { useState, useEffect } from "react";
import { getCard } from "../services/pokemonApi";

/**
 * Custom hook to fetch multiple Pokemon cards by IDs
 * @param {string[]} cardIds - Array of card IDs to fetch
 * @returns {object} { cards, loading, error }
 */
export function useCards(cardIds) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cardIds || cardIds.length === 0) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchCards() {
      try {
        setLoading(true);
        setError(null);

        const cardPromises = cardIds.map((id) => getCard(id));
        const results = await Promise.all(cardPromises);

        if (!controller.signal.aborted) {
          setCards(results);
          setLoading(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchCards();

    return () => {
      controller.abort();
    };
  }, [cardIds.join(",")]);

  return { cards, loading, error };
}
