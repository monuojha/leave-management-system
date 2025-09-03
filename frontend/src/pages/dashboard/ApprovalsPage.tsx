"use client"

import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "../../hooks/redux"
import { fetchPendingApprovals, approveLeaveRequest, rejectLeaveRequest } from "../../store/slices/leaveSlice"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Textarea } from "../../components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { CheckCircle, XCircle, Clock, User } from "lucide-react"
import { formatDate } from "../../lib/utils"

export default function ApprovalsPage() {
  const dispatch = useAppDispatch()
  const { pendingApprovals, isLoading } = useAppSelector((state) => state.leave)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [action, setAction] = useState<"approve" | "reject" | null>(null)
  const [comments, setComments] = useState("")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    dispatch(fetchPendingApprovals())
  }, [dispatch])

  const handleAction = async () => {
    if (!selectedRequest || !action) return

    setProcessing(true)
    try {
      if (action === "approve") {
        await dispatch(approveLeaveRequest({ id: selectedRequest.id, comments }))
      } else {
        await dispatch(rejectLeaveRequest({ id: selectedRequest.id, comments }))
      }
      setSelectedRequest(null)
      setAction(null)
      setComments("")
      dispatch(fetchPendingApprovals())
    } finally {
      setProcessing(false)
    }
  }

  const openActionDialog = (request: any, actionType: "approve" | "reject") => {
    setSelectedRequest(request)
    setAction(actionType)
    setComments("")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Leave Approvals</h1>
        <p className="text-muted-foreground">Review and approve pending leave requests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Leave requests awaiting your approval</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading pending approvals...</p>
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {request.user.firstName} {request.user.lastName}
                        </span>
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Leave Type</p>
                          <p className="font-medium">{request.leaveType.replace("_", " ")}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-medium">{request.days} days</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Start Date</p>
                          <p className="font-medium">{formatDate(request.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">End Date</p>
                          <p className="font-medium">{formatDate(request.endDate)}</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground">Reason</p>
                        <p className="text-sm">{request.reason}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Submitted on {formatDate(request.createdAt)} • Department:{" "}
                        {request.user.department?.name || "N/A"}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => openActionDialog(request, "approve")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openActionDialog(request, "reject")}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={!!selectedRequest && !!action}
        onOpenChange={() => {
          setSelectedRequest(null)
          setAction(null)
          setComments("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === "approve" ? "Approve" : "Reject"} Leave Request</DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? "Are you sure you want to approve this leave request?"
                : "Are you sure you want to reject this leave request?"}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">
                  {selectedRequest.user.firstName} {selectedRequest.user.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.leaveType.replace("_", " ")} • {selectedRequest.days} days
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Comments (Optional)</label>
                <Textarea
                  placeholder={`Add comments for this ${action}...`}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRequest(null)
                    setAction(null)
                    setComments("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAction}
                  disabled={processing}
                  className={action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                  variant={action === "reject" ? "destructive" : "default"}
                >
                  {processing ? "Processing..." : `${action === "approve" ? "Approve" : "Reject"} Request`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
