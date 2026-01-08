import { useLocation, Link } from "react-router-dom";
import { Icon } from "@iconify/react";

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="bg-red-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-3 sm:mb-0">
            <Icon
              icon="arcticons:pokemon-tcgp"
              style={{ width: "48px", height: "48px", color: "#2a09ab" }}
            />
            <h1 className="text-xl sm:text-2xl font-bold">PokeShop</h1>
            <Icon
              icon="arcticons:pokemon-tcgp"
              style={{ width: "48px", height: "48px", color: "#2a09ab" }}
            />
          </div>

          {/* Menu Items - Stack on mobile, horizontal on larger screens */}
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <Link
              to="/"
              className={`px-2 sm:px-3 py-2 rounded-md text-sm sm:text-base font-medium transition-all duration-300 hover:scale-110 ${
                location.pathname === "/" ? "text-black" : "hover:text-blue-400"
              }`}
            >
              Homepage
            </Link>
            <Link
              to="/shop"
              className={`px-2 sm:px-3 py-2 rounded-md text-sm sm:text-base font-medium transition-all duration-300 hover:scale-110 ${
                location.pathname === "/shop" ? "text-black" : "hover:text-blue-400"
              }`}
            >
              Shop
            </Link>
            <Link
              to="/login"
              className={`px-2 sm:px-3 py-2 rounded-md text-sm sm:text-base font-medium transition-all duration-300 hover:scale-110 ${
                location.pathname === "/login" ? "text-black" : "hover:text-blue-400"
              }`}
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
