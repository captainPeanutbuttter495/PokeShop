import { useCard } from "../hooks/useCard";
import { getBestPrice, formatPrice } from "../services/pokemonApi";

// Base Set Charizard - one of the most iconic cards
const FEATURED_CARD_ID = "base1-4";

const Hero = () => {
  const { card, loading, error } = useCard(FEATURED_CARD_ID);

  if (loading) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-[400px] w-[280px] animate-pulse rounded-xl bg-slate-700" />
          <div className="h-6 w-48 animate-pulse rounded bg-slate-700" />
          <div className="h-8 w-32 animate-pulse rounded bg-slate-700" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center text-red-400">
          <p className="text-lg">Failed to load featured card</p>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </section>
    );
  }

  if (!card) return null;

  const priceData = getBestPrice(card.tcgplayer);

  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Ambient glow effect behind the card */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-amber-500/20 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 py-12">
        {/* Card image with hover effect */}
        <div className="group relative">
          {/* Card glow on hover */}
          <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-60" />

          {/* Card container */}
          <div className="relative transform transition-transform duration-300 ease-out group-hover:scale-105">
            <img
              src={card.images.small}
              alt={card.name}
              className="h-auto w-[280px] rounded-xl shadow-2xl sm:w-[320px]"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>

        {/* Card info */}
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{card.name}</h2>

          <p className="mt-1 text-sm text-slate-400">
            {card.set.name} · {card.rarity}
          </p>

          {priceData && (
            <p className="mt-4 text-3xl font-bold text-amber-400 sm:text-4xl">
              {formatPrice(priceData.price)}
            </p>
          )}

          {priceData && (
            <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
              Market Price ({priceData.type.replace(/([A-Z])/g, " $1").trim()})
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
