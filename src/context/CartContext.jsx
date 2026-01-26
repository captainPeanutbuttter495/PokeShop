// src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUser } from "./UserContext";
import { getCart, addToCart as apiAddToCart, removeFromCart as apiRemoveFromCart, clearCart as apiClearCart } from "../Services/cartApi";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "pokeshop_cart";

export const CartProvider = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const { profile } = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Calculate derived values
  const itemCount = items.length;
  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.listing.price), 0);
  }, [items]);

  // Get listing IDs in cart for quick lookup
  const cartListingIds = useMemo(() => {
    return new Set(items.map((item) => item.listing.id));
  }, [items]);

  // Check if a listing is in cart
  const isInCart = useCallback((listingId) => {
    return cartListingIds.has(listingId);
  }, [cartListingIds]);

  // Save cart to localStorage (for faster initial load when user logs back in)
  const saveLocalCart = useCallback((cartItems) => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (err) {
      console.error("Error saving cart to localStorage:", err);
    }
  }, []);

  // Fetch cart from server (for authenticated users)
  const refreshCart = useCallback(async () => {
    if (!isAuthenticated || authLoading || !profile) {
      return;
    }

    try {
      setLoading(true);
      const data = await getCart(getAccessTokenSilently);
      setItems(data.items);
      saveLocalCart(data.items);
    } catch (err) {
      console.error("Error fetching cart:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, profile, getAccessTokenSilently, saveLocalCart]);

  // Initialize cart on mount and auth state change
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated && profile) {
      // User is authenticated with profile - fetch from server
      refreshCart().then(() => setInitialized(true));
    } else {
      // User is not authenticated or no profile - clear cart display
      // (DB cart remains intact for when they log back in)
      setItems([]);
      setInitialized(true);
    }
  }, [isAuthenticated, authLoading, profile, refreshCart]);

  // Add item to cart
  const addToCart = useCallback(async (listing) => {
    // Must be authenticated to add to cart
    if (!isAuthenticated || !profile) {
      throw new Error("Please sign in to add items to cart");
    }

    // Check if already in cart
    if (isInCart(listing.id)) {
      throw new Error("Item already in cart");
    }

    // Add via API
    const data = await apiAddToCart(getAccessTokenSilently, listing.id);
    setItems((prev) => {
      const updated = [data.item, ...prev];
      saveLocalCart(updated);
      return updated;
    });
    return data.item;
  }, [isAuthenticated, profile, isInCart, getAccessTokenSilently, saveLocalCart]);

  // Remove item from cart
  const removeFromCart = useCallback(async (listingId) => {
    if (!isAuthenticated || !profile) {
      return;
    }

    // Remove via API
    await apiRemoveFromCart(getAccessTokenSilently, listingId);

    setItems((prev) => {
      const updated = prev.filter((item) => item.listing.id !== listingId);
      saveLocalCart(updated);
      return updated;
    });
  }, [isAuthenticated, profile, getAccessTokenSilently, saveLocalCart]);

  // Clear cart
  const clearCartItems = useCallback(async () => {
    if (!isAuthenticated || !profile) {
      return;
    }

    // Clear via API
    await apiClearCart(getAccessTokenSilently);

    setItems([]);
    saveLocalCart([]);
  }, [isAuthenticated, profile, getAccessTokenSilently, saveLocalCart]);

  // Clear local cart only (after successful checkout)
  const clearLocalCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const value = {
    items,
    loading,
    initialized,
    itemCount,
    totalPrice,
    isInCart,
    addToCart,
    removeFromCart,
    clearCart: clearCartItems,
    clearLocalCart,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
