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
      <section className="overflow-hidden bg-slate-900 py-6 sm:py-12">
        <div className="flex gap-4 sm:gap-8">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="h-16 w-24 flex-shrink-0 animate-pulse rounded-lg bg-slate-800 sm:h-32 sm:w-32 sm:rounded-xl"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || sets.length === 0) {
    return null;
  }

  // Create enough duplicates to fill the screen and enable seamless looping
  const duplicatedSets = [...sets, ...sets, ...sets, ...sets];

  return (
    <section className="overflow-hidden bg-slate-900 py-6 sm:py-12">
      {/* Section Header */}
      <div className="mx-auto mb-4 max-w-7xl px-4 sm:mb-8 sm:px-6 lg:px-8">
        <h2 className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 sm:text-sm">
          Featured Collections
        </h2>
      </div>

      {/* Infinite Scroll Container */}
      <div className="relative">
        {/* Gradient Fade Left */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-slate-900 to-transparent sm:w-32" />

        {/* Gradient Fade Right */}
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-slate-900 to-transparent sm:w-32" />

        {/* Scrolling Track - using two identical tracks for seamless loop */}
        <div className="flex w-max animate-scroll">
          {duplicatedSets.map((set, index) => (
            <div
              key={`${set.id}-${index}`}
              className="mx-2 flex-shrink-0 sm:mx-4"
            >
              <div className="rounded-lg bg-slate-800 p-2 sm:rounded-xl sm:p-4">
                <img
                  src={set.images.logo}
                  alt={set.name}
                  className="h-12 w-auto min-w-[80px] object-contain sm:h-20 sm:min-w-[120px]"
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
            transform: translateX(-25%);
          }
        }

        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
      `}</style>
    </section>
  );
};

export default SetCarousel;
