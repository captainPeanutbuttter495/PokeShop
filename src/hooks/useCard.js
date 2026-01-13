import { useState, useEffect } from 'react';
import { getCard } from '../services/pokemonApi';

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

    const controller = new AbortController();

    async function fetchCard() {
      try {
        setLoading(true);
        setError(null);
        const data = await getCard(cardId);
        
        if (!controller.signal.aborted) {
          setCard(data);
          setLoading(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchCard();

    return () => {
      controller.abort();
    };
  }, [cardId]);

  return { card, loading, error };
}