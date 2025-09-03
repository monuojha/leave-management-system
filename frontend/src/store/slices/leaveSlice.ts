import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import api from "../../lib/api"

interface LeaveRequest {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: string
  isHalfDay: boolean
  approver?: {
    firstName: string
    lastName: string
  }
  createdAt: string
}

interface LeaveBalance {
  id: string
  leaveType: string
 total: number
  used: number
  remaining: number
  year: number
}

interface LeaveState {
  requests: LeaveRequest[]
  balances: LeaveBalance[]
  pendingApprovals: LeaveRequest[]
  isLoading: boolean
  error: string | null
  lastFetch: number | null
}

const initialState: LeaveState = {
  requests: [],
  balances: [],
  pendingApprovals: [],
  isLoading: false,
  error: null,
  lastFetch: null,
}

const CACHE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

// Async thunks
export const fetchLeaveRequests = createAsyncThunk(
  "leave/fetchRequests",
  async (
    params: { page?: number; limit?: number; status?: string; force?: boolean } = {},
    { rejectWithValue, getState },
  ) => {
    try {
      const state = getState() as { leave: LeaveState }
      const now = Date.now()

      if (!params.force && state.leave.lastFetch && now - state.leave.lastFetch < CACHE_TIMEOUT) {
        return state.leave.requests
      }

      const response = await api.get("/leave/requests", { params })
      return response.data.data.requests
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "Failed to fetch leave requests")
    }
  },
)

export const createLeaveRequest = createAsyncThunk(
  "leave/createRequest",
  async (requestData: any, { rejectWithValue }) => {
    try {
      const response = await api.post("/leave/requests", requestData)
      return response.data.data.request
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "Failed to create leave request")
    }
  },
)

export const fetchLeaveBalances = createAsyncThunk("leave/fetchBalances", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get("/leave/balances")
    return response.data.data.balances
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || "Failed to fetch leave balances")
  }
})

export const fetchPendingApprovals = createAsyncThunk(
  "leave/fetchPendingApprovals",
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/leave/approvals", { params })
      return response.data.data.requests
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "Failed to fetch pending approvals")
    }
  },
)

export const approveLeaveRequest = createAsyncThunk(
  "leave/approveRequest",
  async ({ id, comments }: { id: string; comments?: string }, { rejectWithValue }) => {
    try {
      await api.post(`/leave/approvals/${id}/approve`, { comments })
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "Failed to approve leave request")
    }
  },
)

export const rejectLeaveRequest = createAsyncThunk(
  "leave/rejectRequest",
  async ({ id, comments }: { id: string; comments?: string }, { rejectWithValue }) => {
    try {
      await api.post(`/leave/approvals/${id}/reject`, { comments })
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || "Failed to reject leave request")
    }
  },
)

const leaveSlice = createSlice({
  name: "leave",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    forceRefresh: (state) => {
      state.lastFetch = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch requests
      .addCase(fetchLeaveRequests.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchLeaveRequests.fulfilled, (state, action) => {
        state.isLoading = false
        state.requests = action.payload
        state.lastFetch = Date.now()
      })
      .addCase(fetchLeaveRequests.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create request
      .addCase(createLeaveRequest.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createLeaveRequest.fulfilled, (state, action) => {
        state.isLoading = false
        state.requests.unshift(action.payload)
        state.lastFetch = null
      })
      .addCase(createLeaveRequest.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch balances
      .addCase(fetchLeaveBalances.fulfilled, (state, action) => {
        state.balances = action.payload
      })
      // Fetch pending approvals
      .addCase(fetchPendingApprovals.fulfilled, (state, action) => {
        state.pendingApprovals = action.payload
      })
      // Approve request
      .addCase(approveLeaveRequest.fulfilled, (state, action) => {
        state.pendingApprovals = state.pendingApprovals.filter((req) => req.id !== action.payload)
      })
      // Reject request
      .addCase(rejectLeaveRequest.fulfilled, (state, action) => {
        state.pendingApprovals = state.pendingApprovals.filter((req) => req.id !== action.payload)
      })
  },
})

export const { clearError, forceRefresh } = leaveSlice.actions
export default leaveSlice.reducer
