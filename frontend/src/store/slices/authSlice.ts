import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import api from "../../lib/api"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  department?: string
  profileImage?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("token"), // keep token if present
  isAuthenticated: false,               // ✅ start always false (manual login only)
  isLoading: false,
  error: null,
}

// Async thunks
export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/login", { email, password })
      const { user, token } = response.data.data
      localStorage.setItem("token", token)
      return { user, token }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "Login failed")
    }
  },
)

export const register = createAsyncThunk("auth/register", async (userData: any, { rejectWithValue }) => {
  try {
    const response = await api.post("/auth/register", userData)
    return response.data
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || "Registration failed")
  }
})

export const verifyOTP = createAsyncThunk(
  "auth/verifyOTP",
  async ({ email, otp }: { email: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/verify-otp", { email, otp })
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "OTP verification failed")
    }
  },
)

// ✅ only call this in protected routes, not automatically
export const checkAuth = createAsyncThunk("auth/checkAuth", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get("/auth/me")
    return response.data.data.user
  } catch (error: any) {
    localStorage.removeItem("token")
    return rejectWithValue("Authentication failed")
  }
})

export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    await api.post("/auth/logout")
  } catch (error) {
    // ignore API failure
  }
  localStorage.removeItem("token")
})

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true // ✅ set auth only after successful login
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Verify OTP
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyOTP.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Check Auth (manual usage)
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.error = null
      })
  },
})

export const { clearError, setCredentials } = authSlice.actions
export default authSlice.reducer
