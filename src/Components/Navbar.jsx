// src/Components/Navbar.jsx
import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Icon } from "@iconify/react";
import { useUser } from "../context/UserContext";

const Navbar = () => {
  const location = useLocation();
  const { loginWithRedirect, logout, user: auth0User, isAuthenticated, isLoading } = useAuth0();
  const { profile, profileLoading } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Display name: prefer database username over Auth0 name
  const displayName = profile?.username || auth0User?.name || "User";

  // Profile picture: prefer Pokemon sprite over Auth0 picture
  const profilePicture = profile?.favoritePokemon
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${profile.favoritePokemon}.png`
    : auth0User?.picture;

  // Check if profile setup is needed
  const needsProfileSetup = isAuthenticated && !isLoading && !profileLoading && !profile;

  const navLinks = [
    { path: "/", label: "Home", icon: "mdi:home" },
    { path: "/shop", label: "Shop", icon: "mdi:store" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between sm:h-16">
          {/* Logo/Brand */}
          <Link to="/" className="group flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 blur transition-opacity duration-300 group-hover:opacity-70" />
              <div className="relative rounded-lg bg-slate-800 p-1.5 sm:p-2">
                <Icon
                  icon="game-icons:pokemon"
                  className="h-5 w-5 text-amber-400 transition-transform duration-300 group-hover:scale-110 sm:h-7 sm:w-7"
                />
              </div>
            </div>
            <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
              PokeShop
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`group relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-amber-400"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Icon
                    icon={link.icon}
                    className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${
                      isActive ? "text-amber-400" : ""
                    }`}
                  />
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
                  )}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="mx-2 h-6 w-px bg-slate-700" />

            {/* Auth Section - Desktop */}
            {isLoading || profileLoading ? (
              <div className="flex h-9 w-9 items-center justify-center">
                <Icon icon="mdi:loading" className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : isAuthenticated ? (
              <div className="group relative">
                {/* User Avatar Button */}
                <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-300 hover:bg-slate-800">
                  <div className="relative">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt={displayName}
                        className="h-8 w-8 rounded-full bg-slate-700 ring-2 ring-slate-600 transition-all duration-300 group-hover:ring-amber-400/50"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 ring-2 ring-slate-600 transition-all duration-300 group-hover:ring-amber-400/50">
                        <Icon icon="mdi:account" className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                    {/* Online indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
                  </div>
                  <div className="hidden flex-col items-start lg:flex">
                    <span className="text-sm font-medium text-white">{displayName}</span>
                    {profile?.role && (
                      <span
                        className={`text-xs ${
                          profile.role === "ADMIN"
                            ? "text-purple-400"
                            : profile.role === "SELLER"
                              ? "text-emerald-400"
                              : "text-slate-500"
                        }`}
                      >
                        {profile.role.charAt(0) + profile.role.slice(1).toLowerCase()}
                      </span>
                    )}
                  </div>
                  <Icon
                    icon="mdi:chevron-down"
                    className="h-4 w-4 text-slate-400 transition-transform duration-300 group-hover:rotate-180"
                  />
                </button>

                {/* Dropdown Menu */}
                <div className="invisible absolute right-0 top-full z-50 mt-2 w-56 origin-top-right scale-95 rounded-xl border border-slate-700 bg-slate-800/95 p-2 opacity-0 shadow-xl backdrop-blur-xl transition-all duration-200 group-hover:visible group-hover:scale-100 group-hover:opacity-100">
                  {/* User Info Header */}
                  <div className="mb-2 border-b border-slate-700 px-3 pb-3 pt-1">
                    <p className="text-sm font-medium text-white">{displayName}</p>
                    <p className="text-xs text-slate-400">{auth0User?.email}</p>
                  </div>

                  {/* Profile Setup Warning */}
                  {needsProfileSetup && (
                    <Link
                      to="/profile"
                      className="mb-2 flex items-center gap-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-400 transition-colors hover:bg-amber-500/20"
                    >
                      <Icon icon="mdi:alert-circle" className="h-4 w-4" />
                      Complete Profile
                    </Link>
                  )}

                  <Link
                    to="/profile"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                  >
                    <Icon icon="mdi:account-circle" className="h-4 w-4" />
                    Profile
                  </Link>

                  {/* Admin Dashboard Link */}
                  {profile?.role === "ADMIN" && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-purple-400 transition-colors hover:bg-purple-500/10"
                    >
                      <Icon icon="mdi:shield-crown" className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}

                  <div className="my-2 border-t border-slate-700" />

                  <button
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <Icon icon="mdi:logout" className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => loginWithRedirect()}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/25 transition-all duration-300 hover:shadow-amber-500/40"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Icon icon="mdi:login" className="h-4 w-4" />
                  Sign In
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </button>
            )}
          </div>

          {/* Mobile Menu Button & Auth */}
          <div className="flex items-center gap-2 sm:hidden">
            {/* Mobile Auth */}
            {isLoading || profileLoading ? (
              <Icon icon="mdi:loading" className="h-5 w-5 animate-spin text-slate-400" />
            ) : isAuthenticated ? (
              <Link to="/profile" className="relative">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt={displayName}
                    className="h-8 w-8 rounded-full bg-slate-700 ring-2 ring-slate-600"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 ring-2 ring-slate-600">
                    <Icon icon="mdi:account" className="h-5 w-5 text-slate-400" />
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-500" />
              </Link>
            ) : (
              <button
                onClick={() => loginWithRedirect()}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-medium text-white"
              >
                Sign In
              </button>
            )}

            {/* Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <Icon icon={mobileMenuOpen ? "mdi:close" : "mdi:menu"} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-700 py-3 sm:hidden">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? "bg-amber-500/10 text-amber-400"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon icon={link.icon} className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}

            {isAuthenticated && (
              <>
                <div className="my-2 border-t border-slate-700" />
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Icon icon="mdi:account-circle" className="h-5 w-5" />
                  Profile
                </Link>
                {profile?.role === "ADMIN" && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-purple-400 hover:bg-purple-500/10"
                  >
                    <Icon icon="mdi:shield-crown" className="h-5 w-5" />
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout({ logoutParams: { returnTo: window.location.origin } });
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10"
                >
                  <Icon icon="mdi:logout" className="h-5 w-5" />
                  Sign Out
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
