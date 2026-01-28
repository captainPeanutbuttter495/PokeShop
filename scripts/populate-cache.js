// scripts/populate-cache.js - One-time script to populate S3 cache from TCGdex API
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// TCGdex API (free, no key required)
const TCGDEX_API = "https://api.tcgdex.net/v2/en";

// Featured card IDs (Base Set cards)
const FEATURED_CARD_IDS = [
  "base1-4",  // Charizard
  "base1-2",  // Blastoise
  "base1-15", // Venusaur
  "base1-10", // Mewtwo
  "base1-16", // Zapdos
];

// Featured set IDs (TCGdex format - uses dots for special sets)
const FEATURED_SET_IDS = [
  "sm12",    // Cosmic Eclipse
  "swsh4.5", // Shining Fates
  "swsh7",   // Evolving Skies
  "cel25",   // Celebrations
  "swsh9",   // Brilliant Stars
  "sv03.5",  // 151
  "sv08.5",  // Prismatic Evolutions
];

// S3 Configuration
const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const S3_BUCKET = process.env.AWS_S3_BUCKET || "pokeshop-card-images";
const S3_BASE_URL = `https://${S3_BUCKET}.s3.amazonaws.com`;

/**
 * Fetch JSON from URL with error handling
 */
async function fetchJson(url) {
  console.log(`  Fetching: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

/**
 * Download image and return as Buffer
 */
async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image ${url}: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload buffer to S3
 */
async function uploadToS3(key, body, contentType) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3Client.send(command);
  console.log(`  Uploaded: s3://${S3_BUCKET}/${key}`);
  return `${S3_BASE_URL}/${key}`;
}

/**
 * Get the best price from TCGdex pricing data
 * TCGdex structure: cardData.pricing.tcgplayer.{variant}.marketPrice
 */
function getBestPrice(cardData) {
  const tcgplayer = cardData?.pricing?.tcgplayer;
  if (!tcgplayer) return null;

  // Price variants in order of preference
  const priceTypes = ["holofoil", "normal", "reverseHolofoil", "1stEditionHolofoil", "1stEditionNormal"];

  for (const type of priceTypes) {
    if (tcgplayer[type]?.marketPrice) {
      return {
        value: tcgplayer[type].marketPrice,
        type: type,
        source: "TCGPlayer",
      };
    }
  }

  return null;
}

/**
 * Process a single card: fetch data, download image, upload to S3
 */
async function processCard(cardId) {
  console.log(`\nProcessing card: ${cardId}`);

  // Fetch card data from TCGdex
  const cardData = await fetchJson(`${TCGDEX_API}/cards/${cardId}`);

  // Download and upload card image
  let imageUrl = null;
  if (cardData.image) {
    // TCGdex returns image URL without extension, add /high.png for high quality
    const tcgdexImageUrl = `${cardData.image}/high.png`;
    const imageBuffer = await downloadImage(tcgdexImageUrl);
    imageUrl = await uploadToS3(`images/cards/${cardId}.png`, imageBuffer, "image/png");
  }

  // Get pricing data
  const price = getBestPrice(cardData);

  return {
    id: cardData.id || cardId,
    name: cardData.name,
    rarity: cardData.rarity || "Unknown",
    set: {
      name: cardData.set?.name || "Unknown Set",
    },
    images: {
      small: imageUrl,
    },
    price: price,
  };
}

/**
 * Process a single set: fetch data, download logo, upload to S3
 */
async function processSet(setId) {
  console.log(`\nProcessing set: ${setId}`);

  // Fetch set data from TCGdex
  const setData = await fetchJson(`${TCGDEX_API}/sets/${setId}`);

  // Download and upload set logo
  let logoUrl = null;
  if (setData.logo) {
    // TCGdex logo URL
    const logoBuffer = await downloadImage(`${setData.logo}.png`);
    logoUrl = await uploadToS3(`images/sets/${setId}-logo.png`, logoBuffer, "image/png");
  }

  return {
    id: setData.id || setId,
    name: setData.name,
    images: {
      logo: logoUrl,
    },
  };
}

/**
 * Main function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("PokeShop Cache Population Script");
  console.log("=".repeat(60));
  console.log(`\nS3 Bucket: ${S3_BUCKET}`);
  console.log(`TCGdex API: ${TCGDEX_API}`);

  // Process cards
  console.log("\n" + "-".repeat(60));
  console.log("Processing Featured Cards");
  console.log("-".repeat(60));

  const cards = [];
  for (const cardId of FEATURED_CARD_IDS) {
    try {
      const card = await processCard(cardId);
      cards.push(card);
    } catch (error) {
      console.error(`  Error processing card ${cardId}:`, error.message);
    }
  }

  // Process sets
  console.log("\n" + "-".repeat(60));
  console.log("Processing Featured Sets");
  console.log("-".repeat(60));

  const sets = [];
  for (const setId of FEATURED_SET_IDS) {
    try {
      const set = await processSet(setId);
      sets.push(set);
    } catch (error) {
      console.error(`  Error processing set ${setId}:`, error.message);
    }
  }

  // Create JSON data
  const featuredCardsData = {
    lastUpdated: new Date().toISOString(),
    cards: cards,
  };

  const featuredSetsData = {
    lastUpdated: new Date().toISOString(),
    sets: sets,
  };

  // Upload JSON files to S3
  console.log("\n" + "-".repeat(60));
  console.log("Uploading JSON Cache Files");
  console.log("-".repeat(60));

  await uploadToS3(
    "cache/featured-cards.json",
    JSON.stringify(featuredCardsData, null, 2),
    "application/json"
  );

  await uploadToS3(
    "cache/featured-sets.json",
    JSON.stringify(featuredSetsData, null, 2),
    "application/json"
  );

  // Also save local copies for reference
  const localCacheDir = join(projectRoot, ".cache");
  if (!existsSync(localCacheDir)) {
    mkdirSync(localCacheDir, { recursive: true });
  }
  writeFileSync(
    join(localCacheDir, "featured-cards.json"),
    JSON.stringify(featuredCardsData, null, 2)
  );
  writeFileSync(
    join(localCacheDir, "featured-sets.json"),
    JSON.stringify(featuredSetsData, null, 2)
  );
  console.log(`\n  Local copies saved to: ${localCacheDir}`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Cache Population Complete!");
  console.log("=".repeat(60));
  console.log(`\nCards processed: ${cards.length}/${FEATURED_CARD_IDS.length}`);
  console.log(`Sets processed: ${sets.length}/${FEATURED_SET_IDS.length}`);
  console.log(`\nS3 Cache URLs:`);
  console.log(`  Cards: ${S3_BASE_URL}/cache/featured-cards.json`);
  console.log(`  Sets:  ${S3_BASE_URL}/cache/featured-sets.json`);
}

main().catch((error) => {
  console.error("\nFatal error:", error);
  process.exit(1);
});
