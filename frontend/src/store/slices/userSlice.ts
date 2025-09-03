import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import api from "../../lib/api"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  profileImage?: string
  phoneNumber?: string
  dateOfBirth?: string
  address?: string
  department?: {
    id: string
    name: string
  }
  createdAt: string
}

interface UserState {
  users: User[]
  currentUser: User | null
  isLoading: boolean
  error: string | null
}

const initialState: UserState = {
  users: [],
  currentUser: null,
  isLoading: false,
  error: null,
}

// Async thunks
export const fetchUsers = createAsyncThunk(
  "user/fetchUsers",
  async (params: { page?: number; limit?: number; role?: string; department?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/users", { params })
      return response.data.data.users
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "Failed to fetch users")
    }
  },
)

export const updateProfile = createAsyncThunk("user/updateProfile", async (profileData: any, { rejectWithValue }) => {
  try {
    const response = await api.put("/profile", profileData)
    return response.data.data.user
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || "Failed to update profile")
  }
})

export const uploadProfileImage = createAsyncThunk(
  "user/uploadProfileImage",
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData()
      formData.append("image", file)
      const response = await api.post("/upload/profile-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      return response.data.data.imageUrl
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "Failed to upload image")
    }
  },
)

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false
        state.users = action.payload
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentUser = action.payload
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Upload profile image
      .addCase(uploadProfileImage.fulfilled, (state, action) => {
        if (state.currentUser) {
          state.currentUser.profileImage = action.payload
        }
      })
  },
})

export const { clearError, setCurrentUser } = userSlice.actions
export default userSlice.reducer
