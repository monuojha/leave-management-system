"use client"

import { useState, useEffect, useCallback } from "react"
import { useAppDispatch, useAppSelector } from "../../hooks/redux"
import { fetchLeaveRequests, fetchLeaveBalances } from "../../store/slices/leaveSlice"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { formatDate } from "../../lib/utils"
import CreateLeaveRequestDialog from "../../components/dashboard/CreateLeaveRequestDialog"

export default function LeaveRequestsPage() {
  const dispatch = useAppDispatch()
  const { requests, balances, isLoading, error } = useAppSelector((state) => state.leave)
  const { user } = useAppSelector((state) => state.auth)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  const loadData = useCallback(() => {
    if (!hasInitialized) {
      dispatch(fetchLeaveRequests())
      dispatch(fetchLeaveBalances())
      setHasInitialized(true)
    }
  }, [dispatch, hasInitialized])

  useEffect(() => {
    loadData()
  }, [loadData])

  const canCreateRequest = user?.role === "EMPLOYEE"

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-orange-500" />
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "secondary"
      case "APPROVED":
        return "default"
      case "REJECTED":
        return "destructive"
      default:
        return "secondary"
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>Error loading leave requests: {error}</p>
            </div>
            <Button
              variant="outline"
              className="mt-4 bg-transparent"
              onClick={() => {
                setHasInitialized(false)
                loadData()
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leave Requests</h1>
          <p className="text-muted-foreground">
            {canCreateRequest
              ? "Manage your leave requests and view your balances"
              : "View leave balances and manage team approvals"}
          </p>
        </div>
        {canCreateRequest && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        )}
      </div>

      {!canCreateRequest && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Manager Account</p>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              As a manager, you can view leave balances and approve team requests, but cannot create leave requests.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Leave Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Balances</CardTitle>
          <CardDescription>Your current leave allocation for this year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {balances.map((balance) => (
              <div key={balance.id} className="p-4 border rounded-lg">
                <h3 className="font-medium text-sm text-muted-foreground mb-1">
                  {balance.leaveType.replace("_", " ")}
                </h3>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-primary">{balance.remaining}</span>
                  <span className="text-sm text-muted-foreground">/ {balance.total} days</span>
                </div>
                <div className="mt-2 bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(balance.used / balance.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{balance.used} days used</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests - Only show for employees */}
      {canCreateRequest && (
        <Card>
          <CardHeader>
            <CardTitle>Your Leave Requests</CardTitle>
            <CardDescription>View and track all your leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No leave requests found</p>
                <Button variant="outline" className="mt-4 bg-transparent" onClick={() => setShowCreateDialog(true)}>
                  Create your first request
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium">{request.leaveType.replace("_", " ")}</h3>
                        <Badge variant={getStatusVariant(request.status) as any}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(request.status)}
                            <span className="capitalize">{request.status.toLowerCase()}</span>
                          </div>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.days} days)
                      </p>
                      <p className="text-sm text-muted-foreground">{request.reason}</p>
                      {request.approver && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reviewed by: {request.approver.firstName} {request.approver.lastName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="text-sm">{formatDate(request.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canCreateRequest && <CreateLeaveRequestDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />}
    </div>
  )
}
