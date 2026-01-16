// src/Pages/Profile.jsx
import { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";
import {
  getProfile,
  createProfile,
  updateProfile,
  checkUsername,
  getSellerRequestStatus,
  submitSellerRequest,
} from "../services/userApi";

const STARTER_POKEMON = [
  // Gen 1
  { id: "1", name: "Bulbasaur" },
  { id: "4", name: "Charmander" },
  { id: "7", name: "Squirtle" },
  // Gen 2
  { id: "152", name: "Chikorita" },
  { id: "155", name: "Cyndaquil" },
  { id: "158", name: "Totodile" },
  // Gen 3
  { id: "252", name: "Treecko" },
  { id: "255", name: "Torchic" },
  { id: "258", name: "Mudkip" },
  // Gen 4
  { id: "387", name: "Turtwig" },
  { id: "390", name: "Chimchar" },
  { id: "393", name: "Piplup" },
  // Special
  { id: "25", name: "Pikachu" },
  { id: "151", name: "Mew" },
];

const Profile = () => {
  const {
    isAuthenticated,
    isLoading: authLoading,
    getAccessTokenSilently,
    user: auth0User,
  } = useAuth0();

  // Profile state
  const [profile, setProfile] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState(null);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [favoritePokemon, setFavoritePokemon] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Seller request state
  const [sellerRequest, setSellerRequest] = useState(null);
  const [sellerReason, setSellerReason] = useState("");
  const [requestingSellerStatus, setRequestingSellerStatus] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getProfile(getAccessTokenSilently);
        setProfile(data.user);
        setProfileComplete(data.profileComplete);

        if (data.user) {
          setUsername(data.user.username || "");
          setFavoritePokemon(data.user.favoritePokemon || "");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, authLoading, getAccessTokenSilently]);

  // Fetch seller request status
  useEffect(() => {
    if (!profile) return;

    const fetchSellerStatus = async () => {
      try {
        const data = await getSellerRequestStatus(getAccessTokenSilently);
        const pendingRequest = data.requests?.find((r) => r.status === "PENDING");
        setSellerRequest(pendingRequest || data.requests?.[0] || null);
      } catch (err) {
        console.error("Error fetching seller status:", err);
      }
    };

    fetchSellerStatus();
  }, [profile, getAccessTokenSilently]);

  // Debounced username check
  const checkUsernameAvailability = useCallback(
    async (name) => {
      if (!name || name.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      if (profile?.username === name) {
        setUsernameAvailable(true);
        return;
      }

      try {
        const { available } = await checkUsername(name);
        setUsernameAvailable(available);
      } catch (err) {
        console.error("Error checking username:", err);
      }
    },
    [profile],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    return () => clearTimeout(timer);
  }, [username, checkUsernameAvailability]);

  // Validate username
  useEffect(() => {
    if (!username) {
      setUsernameError(null);
      return;
    }

    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
    } else if (username.length > 20) {
      setUsernameError("Username must be 20 characters or less");
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError("Only letters, numbers, and underscores allowed");
    } else {
      setUsernameError(null);
    }
  }, [username]);

  // Handle profile save
  const handleSave = async (e) => {
    e.preventDefault();

    if (usernameError || !username) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const data = profileComplete
        ? await updateProfile(getAccessTokenSilently, {
            username,
            favoritePokemon: favoritePokemon || null,
          })
        : await createProfile(getAccessTokenSilently, {
            username,
            favoritePokemon: favoritePokemon || null,
            email: auth0User?.email,
          });

      setProfile(data.user);
      setProfileComplete(true);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle seller request
  const handleSellerRequest = async () => {
    try {
      setRequestingSellerStatus(true);
      const data = await submitSellerRequest(getAccessTokenSilently, sellerReason);
      setSellerRequest(data.request);
      setSellerReason("");
    } catch (err) {
      setError(err.message);
    } finally {
      setRequestingSellerStatus(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Icon icon="mdi:loading" className="h-12 w-12 animate-spin text-red-800" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-12">
        <div className="mx-auto max-w-md text-center">
          <Icon icon="mdi:account-lock" className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Login Required</h1>
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  // Profile setup form
  if (!profileComplete || isEditing) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-12">
        <div className="mx-auto max-w-lg">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
              {profileComplete ? "Edit Profile" : "Complete Your Profile"}
            </h1>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* Username */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Username *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full rounded-md border px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                      usernameError
                        ? "border-red-300 focus:ring-red-500"
                        : usernameAvailable === true
                          ? "border-green-300 focus:ring-green-500"
                          : usernameAvailable === false
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-red-500"
                    }`}
                    placeholder="Enter username"
                    maxLength={20}
                  />
                  {username && username.length >= 3 && !usernameError && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameAvailable === true && (
                        <Icon icon="mdi:check-circle" className="h-5 w-5 text-green-500" />
                      )}
                      {usernameAvailable === false && (
                        <Icon icon="mdi:close-circle" className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {usernameError && <p className="mt-1 text-sm text-red-600">{usernameError}</p>}
                {!usernameError && usernameAvailable === false && (
                  <p className="mt-1 text-sm text-red-600">Username is already taken</p>
                )}
              </div>

              {/* Favorite Pokemon */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Favorite Pokemon (Profile Picture)
                </label>
                <select
                  value={favoritePokemon}
                  onChange={(e) => setFavoritePokemon(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select a Pokemon...</option>
                  {STARTER_POKEMON.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Preview */}
                {favoritePokemon && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${favoritePokemon}.png`}
                      alt="Selected Pokemon"
                      className="h-16 w-16 rounded-full bg-gray-100"
                    />
                    <span className="text-sm text-gray-600">Profile picture preview</span>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                {profileComplete && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setUsername(profile?.username || "");
                      setFavoritePokemon(profile?.favoritePokemon || "");
                    }}
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || usernameError || !username || usernameAvailable === false}
                  className="flex-1 rounded-md bg-red-800 px-4 py-2 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : profileComplete ? "Save Changes" : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Profile view
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Profile Card */}
        <div className="mb-6 rounded-lg bg-white p-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {profile.favoritePokemon ? (
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${profile.favoritePokemon}.png`}
                  alt="Profile"
                  className="h-20 w-20 rounded-full bg-gray-100"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200">
                  <Icon icon="mdi:account" className="h-10 w-10 text-gray-500" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.username}</h1>
                <p className="text-gray-600">{profile.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      profile.role === "ADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : profile.role === "SELLER"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Admin Dashboard Link */}
        {profile.role === "ADMIN" && (
          <Link
            to="/admin"
            className="mb-6 flex items-center justify-between rounded-lg bg-purple-50 p-4 transition hover:bg-purple-100"
          >
            <div className="flex items-center gap-3">
              <Icon icon="mdi:shield-crown" className="h-6 w-6 text-purple-600" />
              <span className="font-medium text-purple-900">Admin Dashboard</span>
            </div>
            <Icon icon="mdi:chevron-right" className="h-5 w-5 text-purple-600" />
          </Link>
        )}

        {/* Seller Request Section (only for BUYER role) */}
        {profile.role === "BUYER" && (
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Become a Seller</h2>

            {sellerRequest?.status === "PENDING" ? (
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:clock-outline" className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Request Pending</span>
                </div>
                <p className="mt-2 text-sm text-yellow-700">
                  Your seller request is being reviewed by an admin.
                </p>
              </div>
            ) : sellerRequest?.status === "REJECTED" ? (
              <div className="space-y-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:close-circle" className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800">Request Rejected</span>
                  </div>
                  {sellerRequest.reviewNote && (
                    <p className="mt-2 text-sm text-red-700">Reason: {sellerRequest.reviewNote}</p>
                  )}
                </div>
                <div>
                  <textarea
                    value={sellerReason}
                    onChange={(e) => setSellerReason(e.target.value)}
                    placeholder="Why do you want to become a seller? (optional)"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                  />
                  <button
                    onClick={handleSellerRequest}
                    disabled={requestingSellerStatus}
                    className="mt-2 rounded-md bg-red-800 px-4 py-2 font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {requestingSellerStatus ? "Submitting..." : "Submit New Request"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Want to list and sell Pokemon cards? Submit a request to become a seller.
                </p>
                <textarea
                  value={sellerReason}
                  onChange={(e) => setSellerReason(e.target.value)}
                  placeholder="Why do you want to become a seller? (optional)"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
                <button
                  onClick={handleSellerRequest}
                  disabled={requestingSellerStatus}
                  className="rounded-md bg-red-800 px-4 py-2 font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {requestingSellerStatus ? "Submitting..." : "Request Seller Access"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Seller Status (for SELLER role) */}
        {profile.role === "SELLER" && (
          <div className="rounded-lg bg-green-50 p-6">
            <div className="flex items-center gap-3">
              <Icon icon="mdi:store" className="h-8 w-8 text-green-600" />
              <div>
                <h2 className="font-semibold text-green-900">Seller Account Active</h2>
                <p className="text-sm text-green-700">You can list cards for sale in the shop.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
