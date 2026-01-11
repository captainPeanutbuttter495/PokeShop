import { useState, useEffect } from "react";
import { getCard } from "../services/pokemonApi";

/**
 * Custom hook to fetch a Pokemon card by ID
 * @param {string} cardId - The card ID to fetch
 * @returns {object} { card, loading, error }
 */
export function useCard(cardId) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cardId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchCard() {
      try {
        setLoading(true);
        setError(null);
        const data = await getCard(cardId);

        if (isMounted) {
          setCard(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCard();

    return () => {
      isMounted = false;
    };
  }, [cardId]);

  return { card, loading, error };
}
