// src/Pages/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import {
  getProfile,
  getSellerRequests,
  approveSellerRequest,
  rejectSellerRequest,
  getAllUsers,
  deactivateUser,
  reactivateUser,
  changeUserRole,
} from "../services/userApi";

const AdminDashboard = () => {
  const { isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("requests");

  // Seller requests state
  const [requests, setRequests] = useState([]);
  const [requestsFilter, setRequestsFilter] = useState("PENDING");
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersFilter, setUsersFilter] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  // Check admin access
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    const checkAdmin = async () => {
      try {
        const data = await getProfile(getAccessTokenSilently);
        if (data.user?.role !== "ADMIN") {
          navigate("/profile");
          return;
        }
        setProfile(data.user);
      } catch (err) {
        console.error("Error checking admin:", err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [isAuthenticated, authLoading, getAccessTokenSilently, navigate]);

  // Fetch seller requests
  useEffect(() => {
    if (!profile || activeTab !== "requests") return;

    const fetchRequests = async () => {
      try {
        setLoadingRequests(true);
        const data = await getSellerRequests(getAccessTokenSilently, requestsFilter || null);
        setRequests(data.requests || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchRequests();
  }, [profile, activeTab, requestsFilter, getAccessTokenSilently]);

  // Fetch users
  useEffect(() => {
    if (!profile || activeTab !== "users") return;

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const data = await getAllUsers(getAccessTokenSilently, usersFilter);
        setUsers(data.users || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [profile, activeTab, usersFilter, getAccessTokenSilently]);

  // Handle approve request
  const handleApprove = async (requestId) => {
    try {
      setActionLoading(requestId);
      setError(null);
      await approveSellerRequest(getAccessTokenSilently, requestId);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "APPROVED" } : r)),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject request
  const handleReject = async (requestId) => {
    const reason = prompt("Rejection reason (optional):");
    try {
      setActionLoading(requestId);
      setError(null);
      await rejectSellerRequest(getAccessTokenSilently, requestId, reason || "Request rejected");
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "REJECTED" } : r)),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle deactivate user
  const handleDeactivate = async (userId) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    try {
      setActionLoading(userId);
      setError(null);
      await deactivateUser(getAccessTokenSilently, userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reactivate user
  const handleReactivate = async (userId) => {
    try {
      setActionLoading(userId);
      setError(null);
      await reactivateUser(getAccessTokenSilently, userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: true } : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle role change
  const handleRoleChange = async (userId, newRole) => {
    try {
      setActionLoading(userId);
      setError(null);
      await changeUserRole(getAccessTokenSilently, userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
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

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users and seller requests</p>
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

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 font-medium transition ${
              activeTab === "requests"
                ? "bg-red-800 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Icon icon="mdi:file-document-outline" className="h-5 w-5" />
            Seller Requests
            {requestsFilter === "PENDING" && pendingCount > 0 && (
              <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs text-yellow-900">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 font-medium transition ${
              activeTab === "users"
                ? "bg-red-800 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Icon icon="mdi:account-group" className="h-5 w-5" />
            All Users
          </button>
        </div>

        {/* Seller Requests Tab */}
        {activeTab === "requests" && (
          <div className="rounded-lg bg-white p-6 shadow">
            {/* Filter */}
            <div className="mb-4 flex gap-2">
              {["PENDING", "APPROVED", "REJECTED", ""].map((status) => (
                <button
                  key={status || "all"}
                  onClick={() => setRequestsFilter(status)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    requestsFilter === status
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status || "All"}
                </button>
              ))}
            </div>

            {/* Requests List */}
            {loadingRequests ? (
              <div className="py-8 text-center">
                <Icon icon="mdi:loading" className="mx-auto h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : requests.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No seller requests found.</p>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      {request.user.favoritePokemon ? (
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${request.user.favoritePokemon}.png`}
                          alt=""
                          className="h-12 w-12 rounded-full bg-gray-100"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                          <Icon icon="mdi:account" className="h-6 w-6 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{request.user.username}</p>
                        <p className="text-sm text-gray-500">{request.user.email}</p>
                        {request.reason && (
                          <p className="mt-1 text-sm text-gray-600">
                            <span className="font-medium">Reason:</span> {request.reason}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Requested: {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {request.status === "PENDING" ? (
                        <>
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={actionLoading === request.id}
                            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading === request.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={actionLoading === request.id}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                          >
                            {actionLoading === request.id ? "..." : "Reject"}
                          </button>
                        </>
                      ) : (
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-medium ${
                            request.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {request.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="rounded-lg bg-white p-6 shadow">
            {/* Filter */}
            <div className="mb-4 flex gap-2">
              <select
                value={usersFilter.role || ""}
                onChange={(e) =>
                  setUsersFilter((prev) => ({
                    ...prev,
                    role: e.target.value || undefined,
                  }))
                }
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">All Roles</option>
                <option value="BUYER">Buyer</option>
                <option value="SELLER">Seller</option>
                <option value="ADMIN">Admin</option>
              </select>
              <select
                value={usersFilter.active ?? ""}
                onChange={(e) =>
                  setUsersFilter((prev) => ({
                    ...prev,
                    active: e.target.value || undefined,
                  }))
                }
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Deactivated</option>
              </select>
            </div>

            {/* Users List */}
            {loadingUsers ? (
              <div className="py-8 text-center">
                <Icon icon="mdi:loading" className="mx-auto h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : users.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="pb-3 font-medium">User</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Joined</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user.id} className={!user.isActive ? "bg-gray-50" : ""}>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {user.favoritePokemon ? (
                              <img
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${user.favoritePokemon}.png`}
                                alt=""
                                className="h-10 w-10 rounded-full bg-gray-100"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                                <Icon icon="mdi:account" className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{user.username}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          {user.id !== profile?.id ? (
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              disabled={actionLoading === user.id}
                              className="rounded border px-2 py-1 text-sm"
                            >
                              <option value="BUYER">Buyer</option>
                              <option value="SELLER">Seller</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          ) : (
                            <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                              {user.role} (You)
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              user.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {user.isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          {user.id !== profile?.id && user.role !== "ADMIN" && (
                            <>
                              {user.isActive ? (
                                <button
                                  onClick={() => handleDeactivate(user.id)}
                                  disabled={actionLoading === user.id}
                                  className="text-sm text-red-600 hover:underline disabled:opacity-50"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivate(user.id)}
                                  disabled={actionLoading === user.id}
                                  className="text-sm text-green-600 hover:underline disabled:opacity-50"
                                >
                                  Reactivate
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
