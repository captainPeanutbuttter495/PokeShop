import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFeaturedCards, formatPrice } from "../Services/featuredApi";

const Hero = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["featured-cards"],
    queryFn: getFeaturedCards,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });

  const cards = data?.cards || [];
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate carousel every 3 seconds
  useEffect(() => {
    if (cards.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [cards.length]);

  if (isLoading) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 sm:min-h-[70vh]">
        <div className="flex items-center gap-2 sm:gap-8">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`animate-pulse rounded-xl bg-slate-700 ${
                i === 1 ? "h-[200px] w-[140px] sm:h-[320px] sm:w-[230px]" : "hidden h-[160px] w-[110px] sm:block sm:h-[240px] sm:w-[170px]"
              }`}
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 sm:min-h-[70vh]">
        <div className="text-center text-red-400">
          <p className="text-base sm:text-lg">Failed to load featured cards</p>
          <p className="text-xs text-slate-500 sm:text-sm">{error.message}</p>
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

  return (
    <section className="relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 sm:min-h-[70vh]">
      {/* Ambient glow effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[300px] w-[300px] rounded-full bg-amber-500/20 blur-[80px] sm:h-[500px] sm:w-[500px] sm:blur-[100px]" />
      </div>

      {/* Carousel container */}
      <div className="relative z-10 flex items-center justify-center px-4 py-6 sm:py-12">
        <div className="flex items-center gap-2 sm:gap-4 md:gap-8">
          {visibleCards.map(({ card, position }) => {
            const isCenter = position === 1;
            const isSide = position !== 1;

            return (
              <div
                key={`${card.id}-${position}`}
                className={`relative transition-all duration-500 ease-in-out ${
                  isCenter ? "z-20 scale-100 opacity-100" : "z-10 scale-75 opacity-60"
                } ${isSide ? "hidden sm:block" : ""}`}
              >
                {/* Card glow for center card */}
                {isCenter && (
                  <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 opacity-40 blur-lg sm:-inset-4 sm:blur-xl" />
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
                    className={`h-auto rounded-lg shadow-2xl transition-all duration-500 sm:rounded-xl ${
                      isCenter ? "w-[160px] sm:w-[200px] md:w-[280px]" : "w-[120px] sm:w-[150px] md:w-[200px]"
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
        <div className="relative z-10 px-4 text-center">
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl md:text-3xl">
            {centerCard.name}
          </h2>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            {centerCard.set.name} · {centerCard.rarity}
          </p>
          {centerCard.price && (
            <>
              <p className="mt-2 text-2xl font-bold text-amber-400 sm:mt-4 sm:text-3xl md:text-4xl">
                {formatPrice(centerCard.price.value)}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500 sm:text-xs">
                Market Price ({centerCard.price.type.replace(/([A-Z])/g, " $1").trim()})
              </p>
            </>
          )}
        </div>
      )}

      {/* Carousel indicators */}
      <div className="relative z-10 mt-4 flex gap-1.5 sm:mt-8 sm:gap-2">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-300 sm:h-2 ${
              index === currentIndex ? "w-6 bg-amber-400 sm:w-8" : "w-1.5 bg-slate-600 hover:bg-slate-500 sm:w-2"
            }`}
            aria-label={`Go to card ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
