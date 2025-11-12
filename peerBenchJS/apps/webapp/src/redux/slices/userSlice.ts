import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

import { getUser } from "@/lib/actions/auth";

interface UserState {
  user: any;
  profileData: any;
  status: "loading" | "success" | "failed";
  error: string | null;
  isInitialized: boolean; // Track if initial data loading is complete
}

const initialState: UserState = {
  user: null,
  profileData: null,
  status: "loading",
  error: null,
  isInitialized: false,
};

export const fetchUser = createAsyncThunk("user/fetchUser", async () => {
  const user = await getUser();
  return user;
});

// TODO: Update to use use***API hook
export const fetchProfile = createAsyncThunk("user/fetchProfile", async () => {
  const response = await fetch("/api/v2/profile?stats=true");
  if (!response.ok) throw new Error("Failed to load profile");
  const data = await response.json();
  return data;
});

// TODO: Update to use use***API hook
export const updateProfile = createAsyncThunk(
  "user/updateProfile",
  async (profileData: any) => {
    const response = await fetch("/api/v1/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) throw new Error("Failed to update profile");
    const data = await response.json();
    return data;
  }
);

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // Manually set loading state when needed
    setLoading: (state) => {
      state.status = "loading";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUser
      .addCase(fetchUser.pending, (state) => {
        if (!state.isInitialized || !state.user) {
          state.status = "loading";
        }
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action: PayloadAction<any>) => {
        state.user = action.payload;
        if (state.profileData || !state.isInitialized) {
          state.status = "success";
          state.isInitialized = true;
        }
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to fetch user";
        state.isInitialized = true;
      })
      // fetchProfile
      .addCase(fetchProfile.pending, (state) => {
        if (!state.isInitialized || !state.profileData) {
          state.status = "loading";
        }
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action: PayloadAction<any>) => {
        state.profileData = action.payload;
        if (state.user || !state.isInitialized) {
          state.status = "success";
          state.isInitialized = true;
        }
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to fetch profile";
        state.isInitialized = true;
      })
      // updateProfile
      .addCase(updateProfile.pending, (state) => {
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action: PayloadAction<any>) => {
        state.profileData = action.payload;
        state.status = "success";
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to update profile";
      });
  },
});

export const { setLoading } = userSlice.actions;
export default userSlice.reducer;
