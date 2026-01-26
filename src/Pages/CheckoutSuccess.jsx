// src/Pages/CheckoutSuccess.jsx
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Icon } from "@iconify/react";
import { getCheckoutSession, verifyCheckoutSession } from "../Services/checkoutApi";
import { useCart } from "../context/CartContext";

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const { getAccessTokenSilently, isAuthenticated, isLoading: authLoading } = useAuth0();
  const { clearLocalCart } = useCart();
  const [order, setOrder] = useState(null);
  const [orderGroup, setOrderGroup] = useState(null);
  const [publicInfo, setPublicInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const fetchOrder = async () => {
      if (!sessionId || authLoading) return;

      try {
        setLoading(true);
        setError(null);

        if (isAuthenticated) {
          // Authenticated - get full order details
          const data = await getCheckoutSession(getAccessTokenSilently, sessionId);
          if (data.order) {
            setOrder(data.order);
          } else if (data.orderGroup) {
            setOrderGroup(data.orderGroup);
          }
        } else {
          // Not authenticated - use public verify endpoint
          const data = await verifyCheckoutSession(sessionId);
          setPublicInfo(data);
        }

        // Clear pending checkout and cart from localStorage
        localStorage.removeItem("pendingCheckout");
        clearLocalCart();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [sessionId, getAccessTokenSilently, isAuthenticated, authLoading, clearLocalCart]);

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Auth still loading
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <Icon icon="mdi:loading" className="mx-auto h-12 w-12 animate-spin text-emerald-600" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated but have public info - show order summary
  if (!isAuthenticated && publicInfo) {
    const isCompleted = publicInfo.status === "COMPLETED";
    const isOrderGroup = publicInfo.type === "orderGroup";

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="mb-8 text-center">
            <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${isCompleted ? "bg-emerald-100" : "bg-amber-100"}`}>
              <Icon icon={isCompleted ? "mdi:check-circle" : "mdi:clock-outline"} className={`h-12 w-12 ${isCompleted ? "text-emerald-600" : "text-amber-600"}`} />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              {isCompleted ? "Payment Successful!" : "Payment Processing"}
            </h1>
            <p className="text-gray-600">Thank you for your purchase</p>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-lg">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="font-semibold text-gray-900">
                Order Summary{isOrderGroup ? ` (${publicInfo.items.length} items)` : ""}
              </h2>
            </div>
            <div className={isOrderGroup ? "divide-y divide-gray-200" : "p-6"}>
              {isOrderGroup ? (
                // Cart order - show multiple items
                <>
                  {publicInfo.items.map((item, index) => (
                    <div key={index} className="flex gap-4 p-4">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.cardName} className="h-24 w-18 rounded-lg object-cover shadow" />
                      ) : (
                        <div className="flex h-24 w-18 items-center justify-center rounded-lg bg-gray-100">
                          <Icon icon="mdi:image-off" className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.cardName}</h3>
                        <p className="text-sm text-gray-500">{item.setName}</p>
                        <p className="text-sm text-gray-500">Sold by {item.sellerUsername}</p>
                        <p className="mt-1 font-bold text-emerald-600">{formatPrice(item.amount)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="bg-gray-50 p-4">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-emerald-600">
                        {formatPrice(publicInfo.totalAmount)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                // Single order
                <div className="mb-6 flex gap-4">
                  {publicInfo.imageUrl ? (
                    <img src={publicInfo.imageUrl} alt={publicInfo.cardName} className="h-32 w-24 rounded-lg object-cover shadow" />
                  ) : (
                    <div className="flex h-32 w-24 items-center justify-center rounded-lg bg-gray-100">
                      <Icon icon="mdi:image-off" className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{publicInfo.cardName}</h3>
                    <p className="text-sm text-gray-500">{publicInfo.setName}</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600">{formatPrice(publicInfo.amount)}</p>
                    <p className="mt-1 text-sm text-gray-500">Sold by {publicInfo.sellerUsername}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
            >
              <Icon icon="mdi:store" className="h-5 w-5" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading order details
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <Icon icon="mdi:loading" className="mx-auto h-12 w-12 animate-spin text-emerald-600" />
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || (!order && !orderGroup)) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <Icon icon="mdi:alert-circle" className="mx-auto mb-4 h-20 w-20 text-red-400" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="mb-6 text-gray-600">{error || "Order not found"}</p>
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

  // Render cart order (OrderGroup)
  if (orderGroup) {
    const isPending = orderGroup.status === "PENDING";
    const isCompleted = orderGroup.status === "COMPLETED";

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-2xl px-4 py-16">
          {/* Success Header */}
          <div className="mb-8 text-center">
            {isCompleted ? (
              <>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                  <Icon icon="mdi:check-circle" className="h-12 w-12 text-emerald-600" />
                </div>
                <h1 className="mb-2 text-3xl font-bold text-gray-900">Payment Successful!</h1>
                <p className="text-gray-600">Thank you for your purchase</p>
              </>
            ) : isPending ? (
              <>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                  <Icon icon="mdi:clock-outline" className="h-12 w-12 text-amber-600" />
                </div>
                <h1 className="mb-2 text-3xl font-bold text-gray-900">Payment Processing</h1>
                <p className="text-gray-600">Your order is being confirmed</p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                  <Icon icon="mdi:close-circle" className="h-12 w-12 text-red-600" />
                </div>
                <h1 className="mb-2 text-3xl font-bold text-gray-900">Order {orderGroup.status}</h1>
                <p className="text-gray-600">There was an issue with your order</p>
              </>
            )}
          </div>

          {/* Order Details Card */}
          <div className="overflow-hidden rounded-xl bg-white shadow-lg">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="font-semibold text-gray-900">
                Order Details ({orderGroup.orderItems.length} {orderGroup.orderItems.length === 1 ? "item" : "items"})
              </h2>
            </div>

            <div className="divide-y divide-gray-200">
              {orderGroup.orderItems.map((item) => (
                <div key={item.id} className="flex gap-4 p-4">
                  {item.listing.imageUrl ? (
                    <img
                      src={item.listing.imageUrl}
                      alt={item.listing.cardName}
                      className="h-24 w-18 rounded-lg object-cover shadow"
                    />
                  ) : (
                    <div className="flex h-24 w-18 items-center justify-center rounded-lg bg-gray-100">
                      <Icon icon="mdi:image-off" className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.listing.cardName}</h3>
                    <p className="text-sm text-gray-500">{item.listing.setName}</p>
                    <Link
                      to={`/shop/${item.seller.username}`}
                      className="text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      Sold by {item.seller.username}
                    </Link>
                    <p className="mt-1 font-bold text-emerald-600">{formatPrice(item.amount)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Order ID</span>
                  <span className="font-mono text-gray-900">
                    {orderGroup.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-900">
                    {new Date(orderGroup.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : isPending
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {isCompleted && <Icon icon="mdi:check" className="h-3 w-3" />}
                    {isPending && <Icon icon="mdi:clock-outline" className="h-3 w-3" />}
                    {orderGroup.status}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatPrice(orderGroup.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/orders"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Icon icon="mdi:receipt" className="h-5 w-5" />
              View Order History
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
            >
              <Icon icon="mdi:store" className="h-5 w-5" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render single item order (Order)
  const isPending = order.status === "PENDING";
  const isCompleted = order.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Success Header */}
        <div className="mb-8 text-center">
          {isCompleted ? (
            <>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <Icon icon="mdi:check-circle" className="h-12 w-12 text-emerald-600" />
              </div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">Payment Successful!</h1>
              <p className="text-gray-600">Thank you for your purchase</p>
            </>
          ) : isPending ? (
            <>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                <Icon icon="mdi:clock-outline" className="h-12 w-12 text-amber-600" />
              </div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">Payment Processing</h1>
              <p className="text-gray-600">Your order is being confirmed</p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <Icon icon="mdi:close-circle" className="h-12 w-12 text-red-600" />
              </div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">Order {order.status}</h1>
              <p className="text-gray-600">There was an issue with your order</p>
            </>
          )}
        </div>

        {/* Order Details Card */}
        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Order Details</h2>
          </div>

          <div className="p-6">
            {/* Card Info */}
            <div className="mb-6 flex gap-4">
              {order.listing.imageUrl ? (
                <img
                  src={order.listing.imageUrl}
                  alt={order.listing.cardName}
                  className="h-32 w-24 rounded-lg object-cover shadow"
                />
              ) : (
                <div className="flex h-32 w-24 items-center justify-center rounded-lg bg-gray-100">
                  <Icon icon="mdi:image-off" className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{order.listing.cardName}</h3>
                <p className="text-sm text-gray-500">{order.listing.setName}</p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {formatPrice(order.amount)}
                </p>
              </div>
            </div>

            {/* Order Info Grid */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Seller</span>
                <Link
                  to={`/shop/${order.seller.username}`}
                  className="font-medium text-emerald-600 hover:text-emerald-700"
                >
                  {order.seller.username}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Order ID</span>
                <span className="font-mono text-sm text-gray-900">
                  {order.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-900">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    isCompleted
                      ? "bg-emerald-100 text-emerald-700"
                      : isPending
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {isCompleted && <Icon icon="mdi:check" className="h-3 w-3" />}
                  {isPending && <Icon icon="mdi:clock-outline" className="h-3 w-3" />}
                  {order.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/orders"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Icon icon="mdi:receipt" className="h-5 w-5" />
            View Order History
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700"
          >
            <Icon icon="mdi:store" className="h-5 w-5" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
