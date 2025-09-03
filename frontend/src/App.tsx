"use client"

import { Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "./hooks/redux"
import { checkAuth } from "./store/slices/authSlice"

// Layout components
import AuthLayout from "./components/layouts/AuthLayout"
import DashboardLayout from "./components/layouts/DashboardLayout"
import ProtectedRoute from "./components/auth/ProtectedRoute"

// Pages
import LoginPage from "./pages/auth/LoginPage"
import RegisterPage from "./pages/auth/RegisterPage"
import VerifyOTPPage from "./pages/auth/VerifyOTPPage"
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage"
import DashboardPage from "./pages/dashboard/DashboardPage"
import ProfilePage from "./pages/dashboard/ProfilePage"
import LeaveRequestsPage from "./pages/dashboard/LeaveRequestsPage"
import ApprovalsPage from "./pages/dashboard/ApprovalsPage"
import UsersPage from "./pages/dashboard/UsersPage"

function App() {
  const dispatch = useAppDispatch()
  const { isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (storedToken && !isAuthenticated) {
      dispatch(checkAuth())
    }
  }, [dispatch, isAuthenticated]) // Added isAuthenticated to dependencies

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="verify-otp" element={<VerifyOTPPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="leave-requests" element={<LeaveRequestsPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>

        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
            border: "1px solid hsl(var(--border))",
          },
        }}
      />
    </>
  )
}

export default App
