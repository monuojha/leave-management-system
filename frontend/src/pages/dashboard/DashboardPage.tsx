"use client"

import { useEffect, useState } from "react"
import { useAppDispatch, useAppSelector } from "../../hooks/redux"
import { fetchLeaveBalances, fetchLeaveRequests } from "../../store/slices/leaveSlice"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Calendar, Clock, CheckCircle, XCircle, Users } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default function DashboardPage() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const { balances, requests } = useAppSelector((state) => state.leave)

  const [managerStats, setManagerStats] = useState<any>(null)

  useEffect(() => {
    if (user?.role === "EMPLOYEE") {
      dispatch(fetchLeaveBalances())
      dispatch(fetchLeaveRequests({ limit: 5 }))
    } else if (user?.role === "MANAGER" || user?.role === "HR" || user?.role === "ADMIN") {
      fetchManagerStats()
    }
  }, [dispatch, user?.role])

  const fetchManagerStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setManagerStats(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch manager stats:", error)
    }
  }

  const pendingRequests = requests.filter((req) => req.status === "PENDING").length
  const approvedRequests = requests.filter((req) => req.status === "APPROVED").length
  const rejectedRequests = requests.filter((req) => req.status === "REJECTED").length
  const totalDaysUsed = balances.reduce((sum, balance) => sum + balance.used, 0)
  const totalDaysRemaining = balances.reduce((sum, balance) => sum + balance.remaining, 0)

  if (user?.role === "MANAGER" || user?.role === "HR" || user?.role === "ADMIN") {
    return (
      <div className="space-y-6">
        {/* Manager Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manager Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive team leave management and approval history.</p>
        </div>

        {/* Enhanced Manager Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{managerStats?.pendingApprovals || 0}</div>
              <p className="text-xs text-muted-foreground">Awaiting your review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{managerStats?.totalApproved || 0}</div>
              <p className="text-xs text-muted-foreground">All time approvals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{managerStats?.totalRejected || 0}</div>
              <p className="text-xs text-muted-foreground">All time rejections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{managerStats?.teamMemberCount || 0}</div>
              <p className="text-xs text-muted-foreground">Active employees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Year</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {(managerStats?.totalApproved || 0) + (managerStats?.totalRejected || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total processed</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* All Pending Requests */}
          <Card>
            <CardHeader>
              <CardTitle>All Pending Requests</CardTitle>
              <CardDescription>Complete list of requests awaiting approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {managerStats?.allPendingRequests?.map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {request.user?.firstName} {request.user?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.leaveType.replace("_", " ")} - {formatDate(request.startDate)} to{" "}
                        {formatDate(request.endDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">{request.reason}</p>
                      <p className="text-xs text-blue-600">{request.user?.email}</p>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-orange-500 mr-1" />
                      <span className="text-sm text-orange-600">Pending</span>
                    </div>
                  </div>
                )) || []}
                {(!managerStats?.allPendingRequests || managerStats.allPendingRequests.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">No pending requests</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Approval History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Approval History</CardTitle>
              <CardDescription>Your latest approval and rejection decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {managerStats?.recentApprovals?.map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {request.user?.firstName} {request.user?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.leaveType.replace("_", " ")} - {formatDate(request.startDate)} to{" "}
                        {formatDate(request.endDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">{request.reason}</p>
                      <p className="text-xs text-blue-600">{request.user?.email}</p>
                    </div>
                    <div className="flex items-center">
                      {request.status === "APPROVED" && <CheckCircle className="h-4 w-4 text-green-500 mr-1" />}
                      {request.status === "REJECTED" && <XCircle className="h-4 w-4 text-red-500 mr-1" />}
                      <span className={`text-sm ${request.status === "APPROVED" ? "text-green-600" : "text-red-600"}`}>
                        {request.status}
                      </span>
                    </div>
                  </div>
                )) || []}
                {(!managerStats?.recentApprovals || managerStats.recentApprovals.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">No approval history</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Employee Dashboard (existing code)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.firstName}!</h1>
        <p className="text-muted-foreground">Here's an overview of your leave management dashboard.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalDaysRemaining}</div>
            <p className="text-xs text-muted-foreground">Available leave days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Used</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDaysUsed}</div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedRequests}</div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balances */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leave Balances</CardTitle>
            <CardDescription>Your current leave allocation and usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {balances.map((balance) => (
                <div key={balance.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{balance.leaveType.replace("_", " ")}</p>
                    <p className="text-sm text-muted-foreground">
                      {balance.used} used of {balance.total} total
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{balance.remaining}</p>
                    <p className="text-xs text-muted-foreground">remaining</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Your latest leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{request.leaveType.replace("_", " ")}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    {request.status === "PENDING" && <Clock className="h-4 w-4 text-orange-500 mr-1" />}
                    {request.status === "APPROVED" && <CheckCircle className="h-4 w-4 text-green-500 mr-1" />}
                    {request.status === "REJECTED" && <XCircle className="h-4 w-4 text-red-500 mr-1" />}
                    <span className="text-sm capitalize">{request.status.toLowerCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
