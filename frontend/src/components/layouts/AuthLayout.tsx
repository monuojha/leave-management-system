import { Outlet } from "react-router-dom"
import { Building2 } from "lucide-react"

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center mb-8">
            <Building2 className="h-12 w-12 mr-3" />
            <h1 className="text-3xl font-bold">LeaveFlow</h1>
          </div>
          <h2 className="text-2xl font-semibold mb-4">Professional Leave Management</h2>
          <p className="text-lg opacity-90 mb-8">
            Streamline your organization's leave requests, approvals, and balance tracking with our comprehensive
            management system.
          </p>
          <div className="space-y-4 text-left">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
              <span>Automated approval workflows</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
              <span>Real-time balance tracking</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
              <span>Role-based access control</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
              <span>Comprehensive reporting</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 mr-2 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">LeaveFlow</h1>
            </div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
