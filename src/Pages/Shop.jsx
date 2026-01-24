// src/Pages/Shop.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useUser } from "../context/UserContext";
import { getSellers } from "../services/userApi";

const Shop = () => {
  const { profile } = useUser();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if current user is a seller
  const isCurrentUserSeller = profile?.role === "SELLER" || profile?.role === "ADMIN";

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        setLoading(true);
        // Exclude current user if they're a seller
        const excludeId = isCurrentUserSeller ? profile.id : null;
        const data = await getSellers(excludeId);
        setSellers(data.sellers || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, [profile, isCurrentUserSeller]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-center text-4xl font-bold text-gray-900">Shop Pokemon Cards</h1>
        <p className="mb-12 text-center text-lg text-gray-600">
          Browse cards from our trusted sellers
        </p>

        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-center text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-16 text-center">
            <Icon icon="mdi:loading" className="mx-auto h-12 w-12 animate-spin text-gray-400" />
            <p className="mt-4 text-gray-500">Loading sellers...</p>
          </div>
        ) : sellers.length === 0 ? (
          <div className="py-16 text-center">
            <Icon icon="mdi:store-off" className="mx-auto mb-4 h-20 w-20 text-gray-300" />
            <p className="text-xl text-gray-500">No sellers available yet</p>
            <p className="mt-2 text-gray-400">Check back soon for new sellers!</p>
          </div>
        ) : (
          <>
            <h2 className="mb-6 text-xl font-semibold text-gray-800">
              Our Sellers ({sellers.length})
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sellers.map((seller) => (
                <Link
                  key={seller.id}
                  to={`/shop/${seller.username}`}
                  className="group overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* Seller Card Header */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      {seller.favoritePokemon ? (
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${seller.favoritePokemon}.png`}
                          alt=""
                          className="h-16 w-16 rounded-full bg-white/20 p-1 transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                          <Icon icon="mdi:account" className="h-10 w-10 text-white/80" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-white">{seller.username}</h3>
                        <p className="text-sm text-white/80">
                          Member since {new Date(seller.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Seller Card Body */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Icon icon="mdi:cards" className="h-5 w-5" />
                        <span>
                          {seller._count.cardListings}{" "}
                          {seller._count.cardListings === 1 ? "listing" : "listings"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600 transition-colors group-hover:text-emerald-700">
                        <span className="text-sm font-medium">View Shop</span>
                        <Icon
                          icon="mdi:arrow-right"
                          className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Shop;
