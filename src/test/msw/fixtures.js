// Shared mock data for integration tests (MSW handlers + assertions)

export const MOCK_FEATURED_CARDS = {
  lastUpdated: "2026-01-28T00:00:00.000Z",
  cards: [
    {
      id: "base1-4",
      name: "Charizard",
      rarity: "Rare",
      set: { name: "Base Set" },
      images: { small: "https://pokeshop-card-images.s3.amazonaws.com/images/cards/charizard.png" },
      price: { value: 461.32, type: "holofoil", source: "TCGPlayer" },
    },
    {
      id: "base1-2",
      name: "Blastoise",
      rarity: "Rare",
      set: { name: "Base Set" },
      images: { small: "https://pokeshop-card-images.s3.amazonaws.com/images/cards/blastoise.png" },
      price: { value: 164.65, type: "holofoil", source: "TCGPlayer" },
    },
    {
      id: "base1-15",
      name: "Venusaur",
      rarity: "Rare",
      set: { name: "Base Set" },
      images: { small: "https://pokeshop-card-images.s3.amazonaws.com/images/cards/venusaur.png" },
      price: { value: 132.65, type: "holofoil", source: "TCGPlayer" },
    },
    {
      id: "base1-10",
      name: "Mewtwo",
      rarity: "Rare",
      set: { name: "Base Set" },
      images: { small: "https://pokeshop-card-images.s3.amazonaws.com/images/cards/mewtwo.png" },
      price: { value: 51.51, type: "holofoil", source: "TCGPlayer" },
    },
    {
      id: "base1-16",
      name: "Zapdos",
      rarity: "Rare",
      set: { name: "Base Set" },
      images: { small: "https://pokeshop-card-images.s3.amazonaws.com/images/cards/zapdos.png" },
      price: null,
    },
  ],
};

export const MOCK_FEATURED_SETS = {
  lastUpdated: "2026-01-28T00:00:00.000Z",
  sets: [
    { id: "sm12", name: "Cosmic Eclipse", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/sm12-logo.png" } },
    { id: "swsh4.5", name: "Shining Fates", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/swsh4.5-logo.png" } },
    { id: "swsh7", name: "Evolving Skies", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/swsh7-logo.png" } },
    { id: "cel25", name: "Celebrations", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/cel25-logo.png" } },
    { id: "swsh9", name: "Brilliant Stars", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/swsh9-logo.png" } },
    { id: "base1", name: "Base Set", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/base1-logo.png" } },
    { id: "base2", name: "Jungle", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/base2-logo.png" } },
    { id: "base3", name: "Fossil", images: { logo: "https://pokeshop-card-images.s3.amazonaws.com/images/sets/base3-logo.png" } },
  ],
};
