"use client";

import { Provider, useDispatch, useSelector } from "react-redux";
import { store, AppDispatch, RootState } from "@/redux/store";
import { fetchProfile, fetchUser } from "@/redux/slices/userSlice";
import { useEffect } from "react";

function DataLoader() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, profileData, isInitialized } = useSelector(
    (state: RootState) => state.userSlice
  );

  useEffect(() => {
    // Only fetch user data if we haven't initialized yet
    if (!isInitialized) {
      const needsUser = !user;

      if (needsUser) {
        dispatch(fetchUser());
      }
    }
  }, [dispatch, user, isInitialized]);

  // Separate effect for profile loading
  useEffect(() => {
    // Fetch profile if user is logged in but profile data is missing
    if (user && !profileData) {
      dispatch(fetchProfile());
    }
  }, [dispatch, user, profileData]);

  return null;
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <DataLoader />
      {children}
    </Provider>
  );
}
