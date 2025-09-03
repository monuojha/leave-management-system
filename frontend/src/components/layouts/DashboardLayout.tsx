"use client"

import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { useAppSelector, useAppDispatch } from "../../hooks/redux"
import { logout } from "../../store/slices/authSlice"
import { Building2, LayoutDashboard, Calendar, CheckSquare, Users, User, LogOut, Menu, X } from "lucide-react"
import { useState } from "react"
import { Button } from "../ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"

export default function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await dispatch(logout())
    navigate("/auth/login")
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Leave Requests", href: "/dashboard/leave-requests", icon: Calendar },
    ...(user?.role === "MANAGER" || user?.role === "HR" || user?.role === "ADMIN"
      ? [{ name: "Approvals", href: "/dashboard/approvals", icon: CheckSquare }]
      : []),
    ...(user?.role === "HR" || user?.role === "ADMIN"
      ? [{ name: "Users", href: "/dashboard/users", icon: Users }]
      : []),
    { name: "Profile", href: "/dashboard/profile", icon: User },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-col bg-primary">
            <div className="absolute right-0 top-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <SidebarContent navigation={navigation} location={location} onLogout={handleLogout} user={user} />
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-primary overflow-y-auto">
          <SidebarContent navigation={navigation} location={location} onLogout={handleLogout} user={user} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-2 flex items-center justify-between">
          <button type="button" className="text-gray-500 hover:text-gray-600" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-primary" />
            <span className="font-semibold text-gray-900">LeaveFlow</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  navigation,
  location,
  onLogout,
  user,
}: {
  navigation: any[]
  location: any
  onLogout: () => void
  user: any
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center flex-shrink-0 px-6 py-6">
        <Building2 className="h-8 w-8 text-white mr-3" />
        <span className="text-xl font-bold text-white">LeaveFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User profile */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="flex items-center mb-3">
          <Avatar className="h-8 w-8 mr-3">
            <AvatarImage src={user?.profileImage || "/placeholder.svg"} />
            <AvatarFallback className="bg-white/10 text-white">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-white/60 truncate">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="w-full justify-start text-white/80 hover:text-white hover:bg-white/5"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  )
}
