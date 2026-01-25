// src/Pages/OrderHistory.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Icon } from "@iconify/react";
import { getMyOrders } from "../Services/checkoutApi";

const OrderHistory = () => {
  const { getAccessTokenSilently, isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (authLoading || !isAuthenticated) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getMyOrders(getAccessTokenSilently);
        setOrders(data.orders);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [getAccessTokenSilently, isAuthenticated, authLoading]);

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <Icon icon="mdi:lock" className="mx-auto mb-4 h-20 w-20 text-gray-400" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Sign in Required</h1>
          <p className="mb-6 text-gray-600">Please sign in to view your order history</p>
          <button
            onClick={() => loginWithRedirect()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
          >
            <Icon icon="mdi:login" className="h-5 w-5" />
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading || authLoading) {
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
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <Icon icon="mdi:alert-circle" className="mx-auto mb-4 h-20 w-20 text-red-400" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Error Loading Orders</h1>
          <p className="mb-6 text-gray-600">{error}</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
          >
            <Icon icon="mdi:store" className="h-5 w-5" />
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">My Orders</h1>
          <p className="mt-1 text-gray-600">View your purchase history</p>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="rounded-xl bg-white py-16 text-center shadow-lg">
            <Icon icon="mdi:package-variant" className="mx-auto mb-4 h-20 w-20 text-gray-300" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900">No orders yet</h2>
            <p className="mb-6 text-gray-500">Start shopping to see your orders here</p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
            >
              <Icon icon="mdi:store" className="h-5 w-5" />
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="overflow-hidden rounded-xl bg-white shadow-lg transition hover:shadow-xl"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Card Image */}
                  <div className="aspect-[3/4] w-full sm:w-32">
                    {order.listing.imageUrl ? (
                      <img
                        src={order.listing.imageUrl}
                        alt={order.listing.cardName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100">
                        <Icon icon="mdi:image-off" className="h-10 w-10 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Order Details */}
                  <div className="flex flex-1 flex-col justify-between p-4 sm:p-6">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{order.listing.cardName}</h3>
                          <p className="text-sm text-gray-500">{order.listing.setName}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            order.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700"
                              : order.status === "PENDING"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {order.status === "COMPLETED" && <Icon icon="mdi:check" className="h-3 w-3" />}
                          {order.status === "PENDING" && <Icon icon="mdi:clock-outline" className="h-3 w-3" />}
                          {order.status}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-500">Seller: </span>
                          <Link
                            to={`/shop/${order.seller.username}`}
                            className="font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            {order.seller.username}
                          </Link>
                        </div>
                        <div>
                          <span className="text-gray-500">Date: </span>
                          <span className="text-gray-900">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                      <span className="text-xl font-bold text-emerald-600">
                        {formatPrice(order.amount)}
                      </span>
                      <span className="font-mono text-xs text-gray-400">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
