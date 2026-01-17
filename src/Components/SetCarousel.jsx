// src/Components/SetCarousel.jsx
import { useMemo } from "react";
import { useSets } from "../hooks/useSets";

// Featured set IDs
const FEATURED_SET_IDS = [
  "sm12",    // Sun & Moon Cosmic Eclipse
  "swsh45",  // Shining Fates
  "swsh7",   // Sword & Shield Evolving Skies
  "cel25",   // Celebrations
  "swsh9",   // Sword & Shield Brilliant Stars
  "sv3pt5",  // Scarlet & Violet 151
  "sv8pt5",  // Scarlet & Violet Prismatic Evolutions
];

const SetCarousel = () => {
  const setIds = useMemo(() => FEATURED_SET_IDS, []);
  const { sets, loading, error } = useSets(setIds);

  if (loading) {
    return (
      <section className="overflow-hidden bg-slate-900 py-12">
        <div className="flex gap-8">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="h-32 w-32 flex-shrink-0 animate-pulse rounded-xl bg-slate-800"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || sets.length === 0) {
    return null;
  }

  // Duplicate sets for seamless infinite scroll
  const duplicatedSets = [...sets, ...sets];

  return (
    <section className="overflow-hidden bg-slate-900 py-12">
      {/* Section Header */}
      <div className="mx-auto mb-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
          Featured Collections
        </h2>
      </div>

      {/* Infinite Scroll Container */}
      <div className="relative">
        {/* Gradient Fade Left */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-32 bg-gradient-to-r from-slate-900 to-transparent" />

        {/* Gradient Fade Right */}
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-32 bg-gradient-to-l from-slate-900 to-transparent" />

        {/* Scrolling Track */}
        <div className="flex animate-scroll gap-8">
          {duplicatedSets.map((set, index) => (
            <div
              key={`${set.id}-${index}`}
              className="flex-shrink-0"
            >
              <div className="rounded-xl bg-slate-800 p-4">
                <img
                  src={set.images.logo}
                  alt={set.name}
                  className="h-20 w-auto object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom CSS for infinite scroll animation */}
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </section>
  );
};

export default SetCarousel;
