import { useState, useEffect, useMemo } from "react";
import { useCards } from "../hooks/useCards";
import { getBestPrice, formatPrice } from "../services/pokemonApi";

// 5 iconic Base Set cards for the carousel
const BASE_SET_CARD_IDS = [
  "base1-4", // Charizard
  "base1-2", // Blastoise
  "base1-15", // Venusaur
  "base1-10", // Mewtwo
  "base1-16", // Zapdos
];

const Hero = () => {
  const cardIds = useMemo(() => BASE_SET_CARD_IDS, []);
  const { cards, loading, error } = useCards(cardIds);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate carousel every 3 seconds
  useEffect(() => {
    if (cards.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [cards.length]);

  if (loading) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[320px] w-[230px] animate-pulse rounded-xl bg-slate-700" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center text-red-400">
          <p className="text-lg">Failed to load featured cards</p>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </section>
    );
  }

  if (cards.length === 0) return null;

  // Get visible cards (3 at a time, wrapping around)
  const getVisibleCards = () => {
    const visible = [];
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % cards.length;
      visible.push({ card: cards[index], position: i });
    }
    return visible;
  };

  const visibleCards = getVisibleCards();
  const centerCard = visibleCards[1]?.card;
  const centerPrice = centerCard ? getBestPrice(centerCard.tcgplayer) : null;

  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Ambient glow effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-amber-500/20 blur-[100px]" />
      </div>

      {/* Carousel container */}
      <div className="relative z-10 flex items-center justify-center px-4 py-12">
        <div className="flex items-center gap-4 sm:gap-8">
          {visibleCards.map(({ card, position }) => {
            const isCenter = position === 1;

            return (
              <div
                key={`${card.id}-${position}`}
                className={`relative transition-all duration-500 ease-in-out ${
                  isCenter ? "z-20 scale-100 opacity-100" : "z-10 scale-75 opacity-60"
                }`}
              >
                {/* Card glow for center card */}
                {isCenter && (
                  <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 opacity-40 blur-xl" />
                )}

                {/* Card */}
                <div
                  className={`relative transform transition-transform duration-300 ${
                    isCenter ? "hover:scale-105" : ""
                  }`}
                >
                  <img
                    src={card.images.small}
                    alt={card.name}
                    className={`h-auto rounded-xl shadow-2xl transition-all duration-500 ${
                      isCenter ? "w-[220px] sm:w-[280px]" : "w-[160px] sm:w-[200px]"
                    }`}
                    loading="eager"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center card info */}
      {centerCard && (
        <div className="relative z-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {centerCard.name}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {centerCard.set.name} · {centerCard.rarity}
          </p>
          {centerPrice && (
            <>
              <p className="mt-4 text-3xl font-bold text-amber-400 sm:text-4xl">
                {formatPrice(centerPrice.price)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                Market Price ({centerPrice.type.replace(/([A-Z])/g, " $1").trim()})
              </p>
            </>
          )}
        </div>
      )}

      {/* Carousel indicators */}
      <div className="relative z-10 mt-8 flex gap-2">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? "w-8 bg-amber-400" : "w-2 bg-slate-600 hover:bg-slate-500"
            }`}
            aria-label={`Go to card ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
