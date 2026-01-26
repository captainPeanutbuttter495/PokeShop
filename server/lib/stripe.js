// server/lib/stripe.js
import Stripe from "stripe";
import dotenv from "dotenv";

// Ensure env vars are loaded (ES modules hoist imports before dotenv.config())
dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("⚠️ STRIPE_SECRET_KEY is not set in environment variables");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export default stripe;
