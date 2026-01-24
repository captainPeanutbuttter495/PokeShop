// src/Pages/SellerDashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { getProfile } from "../services/userApi";
import {
  getMyListings,
  createListing,
  updateListing,
  deleteListing,
} from "../services/sellerApi";

const SellerDashboard = () => {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    cardName: "",
    setName: "",
    price: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Check seller access
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    const checkSeller = async () => {
      try {
        const data = await getProfile(getAccessTokenSilently);
        if (data.user?.role !== "SELLER" && data.user?.role !== "ADMIN") {
          navigate("/profile");
          return;
        }
        setProfile(data.user);
      } catch (err) {
        console.error("Error checking seller:", err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkSeller();
  }, [isAuthenticated, authLoading, getAccessTokenSilently, navigate]);

  // Fetch listings
  useEffect(() => {
    if (!profile) return;

    const fetchListings = async () => {
      try {
        setLoadingListings(true);
        const data = await getMyListings(getAccessTokenSilently, statusFilter || null);
        setListings(data.listings || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingListings(false);
      }
    };

    fetchListings();
  }, [profile, statusFilter, getAccessTokenSilently]);

  // Handle image file selection
  const handleImageChange = (file) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Only JPEG, PNG, and WebP images are allowed");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageChange(e.dataTransfer.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.cardName.trim()) {
      setError("Card name is required");
      return;
    }
    if (!formData.setName.trim()) {
      setError("Set name is required");
      return;
    }
    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Price must be a positive number");
      return;
    }

    try {
      setSubmitting(true);
      const formDataToSend = new FormData();
      formDataToSend.append("cardName", formData.cardName.trim());
      formDataToSend.append("setName", formData.setName.trim());
      formDataToSend.append("price", priceNum.toString());
      if (imageFile) {
        formDataToSend.append("image", imageFile);
      }

      const result = await createListing(getAccessTokenSilently, formDataToSend);
      setListings((prev) => [result.listing, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ cardName: "", setName: "", price: "" });
    setImageFile(null);
    setImagePreview(null);
  };

  // Handle status change
  const handleStatusChange = async (listingId, newStatus) => {
    try {
      setActionLoading(listingId);
      setError(null);
      await updateListing(getAccessTokenSilently, listingId, { status: newStatus });
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, status: newStatus } : l)),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete
  const handleDelete = async (listingId) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    try {
      setActionLoading(listingId);
      setError(null);
      await deleteListing(getAccessTokenSilently, listingId);
      setListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Icon icon="mdi:loading" className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  const statusCounts = {
    ACTIVE: listings.filter((l) => l.status === "ACTIVE").length,
    SOLD: listings.filter((l) => l.status === "SOLD").length,
    CANCELLED: listings.filter((l) => l.status === "CANCELLED").length,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-600">Manage your card listings</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700"
          >
            <Icon icon="mdi:plus" className="h-5 w-5" />
            New Listing
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="mb-6 flex gap-2">
          {[
            { value: "", label: "All", count: listings.length },
            { value: "ACTIVE", label: "Active", count: statusCounts.ACTIVE },
            { value: "SOLD", label: "Sold", count: statusCounts.SOLD },
            { value: "CANCELLED", label: "Cancelled", count: statusCounts.CANCELLED },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 font-medium transition ${
                statusFilter === tab.value
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  statusFilter === tab.value
                    ? "bg-emerald-700 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Listings Grid */}
        <div className="rounded-lg bg-white p-6 shadow">
          {loadingListings ? (
            <div className="py-12 text-center">
              <Icon icon="mdi:loading" className="mx-auto h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : listings.length === 0 ? (
            <div className="py-12 text-center">
              <Icon icon="mdi:package-variant" className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <p className="text-gray-500">No listings found.</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 text-emerald-600 hover:underline"
              >
                Create your first listing
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="group relative overflow-hidden rounded-lg border transition hover:shadow-md"
                >
                  {/* Card Image */}
                  <div className="aspect-[3/4] bg-gray-100">
                    {listing.imageUrl ? (
                      <img
                        src={listing.imageUrl}
                        alt={listing.cardName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Icon icon="mdi:image-off" className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute right-2 top-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium shadow ${
                        listing.status === "ACTIVE"
                          ? "bg-green-500 text-white"
                          : listing.status === "SOLD"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-500 text-white"
                      }`}
                    >
                      {listing.status}
                    </span>
                  </div>

                  {/* Card Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{listing.cardName}</h3>
                    <p className="text-sm text-gray-500">{listing.setName}</p>
                    <p className="mt-2 text-lg font-bold text-emerald-600">
                      {formatPrice(listing.price)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Listed {new Date(listing.createdAt).toLocaleDateString()}
                    </p>

                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                      {listing.status === "ACTIVE" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(listing.id, "SOLD")}
                            disabled={actionLoading === listing.id}
                            className="flex-1 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-200 disabled:opacity-50"
                          >
                            Mark Sold
                          </button>
                          <button
                            onClick={() => handleStatusChange(listing.id, "CANCELLED")}
                            disabled={actionLoading === listing.id}
                            className="flex-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {listing.status !== "ACTIVE" && (
                        <button
                          onClick={() => handleStatusChange(listing.id, "ACTIVE")}
                          disabled={actionLoading === listing.id}
                          className="flex-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 transition hover:bg-green-200 disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(listing.id)}
                        disabled={actionLoading === listing.id}
                        className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 disabled:opacity-50"
                      >
                        <Icon icon="mdi:trash-can" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Listing Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold text-gray-900">Create New Listing</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                  setError(null);
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              {/* Error in modal */}
              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              {/* Card Name */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Card Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.cardName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cardName: e.target.value }))}
                  placeholder="e.g., Charizard VMAX"
                  className="w-full rounded-lg border px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Set Name */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Set Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.setName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, setName: e.target.value }))}
                  placeholder="e.g., Darkness Ablaze"
                  className="w-full rounded-lg border px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Price */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Price (USD) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-lg border py-2 pl-7 pr-3 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Card Image <span className="text-gray-400">(optional)</span>
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition ${
                    dragActive
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0])}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="relative mx-auto w-32">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="mx-auto h-40 w-32 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                      >
                        <Icon icon="mdi:close" className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Icon icon="mdi:cloud-upload" className="mx-auto h-10 w-10 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Drag and drop or click to upload
                      </p>
                      <p className="text-xs text-gray-400">JPEG, PNG, or WebP (max 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                    setError(null);
                  }}
                  className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Listing"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
