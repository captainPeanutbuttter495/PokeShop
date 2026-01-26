// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import { UserProvider } from "./context/UserContext";
import { CartProvider } from "./context/CartContext";
import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import HomePage from "./Pages/HomePage";
import Shop from "./Pages/Shop";
import Profile from "./Pages/Profile";
import AdminDashboard from "./Pages/AdminDashboard";
import SellerDashboard from "./Pages/SellerDashboard";
import SellerStorefront from "./Pages/SellerStorefront";
import CheckoutSuccess from "./Pages/CheckoutSuccess";
import OrderHistory from "./Pages/OrderHistory";
import CartPage from "./Pages/CartPage";

const App = () => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience,
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <UserProvider>
        <CartProvider>
          <BrowserRouter>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/shop/:username" element={<SellerStorefront />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/seller" element={<SellerDashboard />} />
                  <Route path="/checkout/success" element={<CheckoutSuccess />} />
                  <Route path="/orders" element={<OrderHistory />} />
                  <Route path="/cart" element={<CartPage />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </CartProvider>
      </UserProvider>
    </Auth0Provider>
  );
};

export default App;
