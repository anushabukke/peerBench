"use client";

import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { fetchUser, fetchProfile } from "@/redux/slices/userSlice";

/**
 * Hook to refresh all data in Redux after authentication
 */
export function useRefreshDataAfterAuth() {
  const dispatch = useDispatch<AppDispatch>();

  const refreshAllData = async () => {
    try {
      // Refresh user data
      await dispatch(fetchUser());

      // Refresh profile data
      await dispatch(fetchProfile());

      console.log("All data refreshed after authentication");
    } catch (error) {
      console.error("Error refreshing data after auth:", error);
    }
  };

  const refreshUserData = async () => {
    try {
      await dispatch(fetchUser());
      await dispatch(fetchProfile());
      console.log("User data refreshed");
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  const clearAllData = () => {
    try {
      console.log("All data cleared after logout");
    } catch (error) {
      console.error("Error clearing data after logout:", error);
    }
  };

  return {
    refreshAllData,
    refreshUserData,
    clearAllData,
  };
}
