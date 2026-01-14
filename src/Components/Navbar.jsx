import { useLocation, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Icon } from "@iconify/react";

const Navbar = () => {
  const location = useLocation();
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0();

  return (
    <nav className="bg-red-800 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col py-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo/Brand */}
          <div className="mb-3 flex items-center justify-center gap-2 sm:mb-0 sm:justify-start">
            <Icon
              icon="arcticons:pokemon-tcgp"
              style={{ width: "48px", height: "48px", color: "#2a09ab" }}
            />
            <h1 className="text-xl font-bold sm:text-2xl">PokeShop</h1>
            <Icon
              icon="arcticons:pokemon-tcgp"
              style={{ width: "48px", height: "48px", color: "#2a09ab" }}
            />
          </div>

          {/* Menu Items */}
          <div className="flex flex-col items-center space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0">
            <Link
              to="/"
              className={`rounded-md px-2 py-2 text-sm font-medium transition-all duration-300 hover:scale-110 sm:px-3 sm:text-base ${
                location.pathname === "/" ? "text-black" : "hover:text-blue-400"
              }`}
            >
              Homepage
            </Link>
            <Link
              to="/shop"
              className={`rounded-md px-2 py-2 text-sm font-medium transition-all duration-300 hover:scale-110 sm:px-3 sm:text-base ${
                location.pathname === "/shop" ? "text-black" : "hover:text-blue-400"
              }`}
            >
              Shop
            </Link>

            {/* Auth Section */}
            {isLoading ? (
              <span className="px-3 py-2 text-sm">Loading...</span>
            ) : isAuthenticated ? (
              <div className="group relative">
                {/* User Avatar and Name - Hover Trigger */}
                <div className="flex cursor-pointer items-center gap-2 px-3 py-2 transition-all duration-300">
                  <img src={user?.picture} alt={user?.name} className="h-8 w-8 rounded-full" />
                  <span className="hidden text-sm sm:inline">{user?.name}</span>
                  <Icon
                    icon="mdi:chevron-down"
                    className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180"
                  />
                </div>

                {/* Dropdown Menu */}
                <div className="invisible absolute right-0 top-full z-50 mt-1 w-48 rounded-md bg-white py-1 opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <Icon icon="mdi:account" className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <Icon icon="mdi:logout" className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => loginWithRedirect()}
                className="px-3 py-2 text-sm font-medium transition-all duration-300 hover:scale-110"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
