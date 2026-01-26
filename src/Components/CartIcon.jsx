// src/Components/CartIcon.jsx
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useCart } from "../context/CartContext";

const CartIcon = () => {
  const { itemCount, loading } = useCart();

  return (
    <Link
      to="/cart"
      className="group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-300 hover:bg-slate-800 hover:text-white"
    >
      <div className="relative">
        <Icon
          icon="mdi:cart-outline"
          className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
        />
        {itemCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
            {itemCount > 9 ? "9+" : itemCount}
          </span>
        )}
        {loading && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        )}
      </div>
      <span className="hidden lg:inline">Cart</span>
    </Link>
  );
};

export default CartIcon;
