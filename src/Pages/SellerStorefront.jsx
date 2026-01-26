// src/Pages/SellerStorefront.jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Icon } from "@iconify/react";
import { getSellerByUsername } from "../services/userApi";
import { useUser } from "../context/UserContext";
import { useCart } from "../context/CartContext";

const SellerStorefront = () => {
  const { username } = useParams();
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const { profile } = useUser();
  const { addToCart, isInCart } = useCart();
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const fetchSeller = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getSellerByUsername(username);
        setSeller(data.seller);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSeller();
  }, [username]);

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Handle add to cart click
  const handleAddToCart = async (listing) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isAuthenticated) {
      loginWithRedirect();
      return;
    }

    try {
      setAddingId(listing.id);
      await addToCart(listing);
      setSuccessMessage(`${listing.cardName} added to cart!`);
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setAddingId(null);
    }
  };

  // Check if user owns this store
  const isOwnStore = profile?.id === seller?.id;

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Icon icon="mdi:loading" className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <Icon icon="mdi:alert-circle" className="mx-auto mb-4 h-20 w-20 text-red-400" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Seller Not Found</h1>
          <p className="mb-6 text-gray-600">{error}</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
          >
            <Icon icon="mdi:arrow-left" className="h-5 w-5" />
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/shop"
          className="mb-6 inline-flex items-center gap-2 text-gray-600 transition hover:text-gray-900"
        >
          <Icon icon="mdi:arrow-left" className="h-5 w-5" />
          Back to all sellers
        </Link>

        {/* Seller Header */}
        <div className="mb-8 overflow-hidden rounded-xl bg-white shadow-lg">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              {/* Avatar */}
              {seller.favoritePokemon ? (
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${seller.favoritePokemon}.png`}
                  alt=""
                  className="h-24 w-24 rounded-full bg-white/20 p-2 sm:h-28 sm:w-28"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 sm:h-28 sm:w-28">
                  <Icon icon="mdi:account" className="h-14 w-14 text-white/80" />
                </div>
              )}

              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{seller.username}</h1>
                <p className="mt-1 text-white/80">
                  Member since {new Date(seller.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
                  <Icon icon="mdi:cards" className="h-5 w-5 text-white/80" />
                  <span className="text-white">
                    {seller.cardListings.length} active{" "}
                    {seller.cardListings.length === 1 ? "listing" : "listings"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Section */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Available Cards</h2>

          {seller.cardListings.length === 0 ? (
            <div className="py-12 text-center">
              <Icon icon="mdi:package-variant" className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <p className="text-lg text-gray-500">No cards available right now</p>
              <p className="mt-2 text-gray-400">Check back later for new listings!</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {seller.cardListings.map((listing) => (
                <div
                  key={listing.id}
                  className="group overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:shadow-lg"
                >
                  {/* Card Image */}
                  <div className="aspect-[3/4] bg-gray-100">
                    {listing.imageUrl ? (
                      <img
                        src={listing.imageUrl}
                        alt={listing.cardName}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Icon icon="mdi:image-off" className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{listing.cardName}</h3>
                    <p className="text-sm text-gray-500">{listing.setName}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xl font-bold text-emerald-600">
                        {formatPrice(listing.price)}
                      </p>
                      <span className="text-xs text-gray-400">
                        Listed {new Date(listing.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Add to Cart Button */}
                    {isOwnStore ? (
                      <div className="mt-3 rounded-lg bg-gray-100 py-2 text-center text-sm text-gray-500">
                        Your listing
                      </div>
                    ) : isInCart(listing.id) ? (
                      <Link
                        to="/cart"
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 font-medium text-white transition hover:bg-amber-600"
                      >
                        <Icon icon="mdi:cart-check" className="h-5 w-5" />
                        In Cart - View
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(listing)}
                        disabled={addingId === listing.id}
                        className="mt-3 w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingId === listing.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                            Adding...
                          </span>
                        ) : !isAuthenticated ? (
                          <span className="flex items-center justify-center gap-2">
                            <Icon icon="mdi:login" className="h-5 w-5" />
                            Login to Add to Cart
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Icon icon="mdi:cart-plus" className="h-5 w-5" />
                            Add to Cart
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-emerald-600 px-4 py-3 text-white shadow-lg">
            <Icon icon="mdi:check-circle" className="h-5 w-5" />
            <span>{successMessage}</span>
            <Link
              to="/cart"
              className="ml-2 rounded bg-white/20 px-2 py-1 text-sm hover:bg-white/30"
            >
              View Cart
            </Link>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-1 hover:opacity-80"
            >
              <Icon icon="mdi:close" className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Error Toast */}
        {errorMessage && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-red-600 px-4 py-3 text-white shadow-lg">
            <Icon icon="mdi:alert-circle" className="h-5 w-5" />
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-2 hover:opacity-80"
            >
              <Icon icon="mdi:close" className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerStorefront;
