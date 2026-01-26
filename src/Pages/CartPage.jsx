// src/Pages/CartPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Icon } from "@iconify/react";
import { useCart } from "../context/CartContext";
import { useUser } from "../context/UserContext";
import { createCartCheckoutSession } from "../Services/cartApi";

const CartPage = () => {
  const { isAuthenticated, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const { profile } = useUser();
  const { items, loading, itemCount, totalPrice, removeFromCart, clearCart } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Handle remove item
  const handleRemove = async (listingId) => {
    try {
      setRemovingId(listingId);
      setError(null);
      await removeFromCart(listingId);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  // Handle clear cart
  const handleClearCart = async () => {
    try {
      setError(null);
      await clearCart();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (!isAuthenticated) {
      loginWithRedirect();
      return;
    }

    if (!profile) {
      setError("Please complete your profile before checkout");
      return;
    }

    if (items.length === 0) {
      return;
    }

    try {
      setCheckoutLoading(true);
      setError(null);

      const listingIds = items.map((item) => item.listing.id);
      const { url, sessionId } = await createCartCheckoutSession(getAccessTokenSilently, listingIds);

      // Save session info to localStorage before redirecting
      localStorage.setItem("pendingCheckout", JSON.stringify({ sessionId, listingIds }));

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setCheckoutLoading(false);
    }
  };

  // Loading state
  if (loading && !items.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Icon icon="mdi:loading" className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Shopping Cart</h1>
            <p className="mt-1 text-gray-600">
              {itemCount === 0
                ? "Your cart is empty"
                : `${itemCount} ${itemCount === 1 ? "item" : "items"} in your cart`}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleClearCart}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Icon icon="mdi:delete-outline" className="h-4 w-4" />
              Clear Cart
            </button>
          )}
        </div>

        {/* Error Toast */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-100 px-4 py-3 text-red-700">
            <Icon icon="mdi:alert-circle" className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto hover:opacity-80">
              <Icon icon="mdi:close" className="h-5 w-5" />
            </button>
          </div>
        )}

        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="rounded-xl bg-white p-12 text-center shadow-lg">
            <Icon icon="mdi:cart-outline" className="mx-auto mb-4 h-20 w-20 text-gray-300" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Your cart is empty</h2>
            <p className="mb-6 text-gray-500">
              Browse our shop to find Pokemon cards to add to your cart.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
            >
              <Icon icon="mdi:store" className="h-5 w-5" />
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-xl bg-white shadow-lg">
                <div className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 sm:p-6">
                      {/* Card Image */}
                      <div className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {item.listing.imageUrl ? (
                          <img
                            src={item.listing.imageUrl}
                            alt={item.listing.cardName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Icon icon="mdi:image-off" className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Card Info */}
                      <div className="flex flex-1 flex-col">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{item.listing.cardName}</h3>
                          <p className="text-sm text-gray-500">{item.listing.setName}</p>
                          {item.listing.seller && (
                            <Link
                              to={`/shop/${item.listing.seller.username}`}
                              className="mt-1 inline-block text-sm text-emerald-600 hover:text-emerald-700"
                            >
                              Sold by {item.listing.seller.username}
                            </Link>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-lg font-bold text-emerald-600">
                            {formatPrice(item.listing.price)}
                          </p>
                          <button
                            onClick={() => handleRemove(item.listing.id)}
                            disabled={removingId === item.listing.id}
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {removingId === item.listing.id ? (
                              <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                            ) : (
                              <Icon icon="mdi:delete-outline" className="h-4 w-4" />
                            )}
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 overflow-hidden rounded-xl bg-white shadow-lg">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <h2 className="font-semibold text-gray-900">Order Summary</h2>
                </div>
                <div className="p-6">
                  <div className="mb-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal ({itemCount} items)</span>
                      <span className="text-gray-900">{formatPrice(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Shipping</span>
                      <span className="text-emerald-600">Free</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="mb-4 flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-emerald-600">
                        {formatPrice(totalPrice)}
                      </span>
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={checkoutLoading || items.length === 0}
                      className="w-full rounded-lg bg-emerald-600 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {checkoutLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                          Processing...
                        </span>
                      ) : !isAuthenticated ? (
                        <span className="flex items-center justify-center gap-2">
                          <Icon icon="mdi:login" className="h-5 w-5" />
                          Login to Checkout
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Icon icon="mdi:lock" className="h-5 w-5" />
                          Proceed to Checkout
                        </span>
                      )}
                    </button>

                    {!isAuthenticated && (
                      <p className="mt-3 text-center text-xs text-gray-500">
                        You'll need to sign in to complete your purchase
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Continue Shopping Link */}
              <div className="mt-4 text-center">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
                >
                  <Icon icon="mdi:arrow-left" className="h-4 w-4" />
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
