import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { getProfile } from "../services/userApi";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated || isLoading) {
      setProfile(null);
      setProfileComplete(false);
      return;
    }

    try {
      setProfileLoading(true);
      const data = await getProfile(getAccessTokenSilently);
      setProfile(data.user);
      setProfileComplete(Boolean(data.user?.username));
    } catch (err) {
      console.error("Error fetching profile:", err);
      setProfile(null);
      setProfileComplete(false);
    } finally {
      setProfileLoading(false);
    }
  }, [isAuthenticated, isLoading, getAccessTokenSilently]);

  // Fetch profile on auth change
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Update profile in context (called after save)
  const updateProfileData = useCallback((newProfile) => {
    setProfile(newProfile);
    setProfileComplete(Boolean(newProfile?.username));
  }, []);

  const value = {
    profile,
    profileLoading,
    profileComplete,
    updateProfileData,
    refetchProfile: fetchProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
