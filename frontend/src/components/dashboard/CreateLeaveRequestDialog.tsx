"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useEffect, useState } from "react"
import { useAppDispatch, useAppSelector } from "../../hooks/redux"
import { createLeaveRequest } from "../../store/slices/leaveSlice"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Checkbox } from "../ui/checkbox"
import { Alert, AlertDescription } from "../ui/alert"
import { Loader2 } from "lucide-react"
import { api } from "../../lib/api"

const leaveRequestSchema = z.object({
  leaveType: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "PERSONAL", "EMERGENCY"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
  isHalfDay: z.boolean().default(false),
  managerId: z.string().optional(),
})

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>

interface CreateLeaveRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Manager {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  department?: {
    name: string
  }
}

export default function CreateLeaveRequestDialog({ open, onOpenChange }: CreateLeaveRequestDialogProps) {
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector((state) => state.leave)
  const { user } = useAppSelector((state) => state.auth)

  const [managers, setManagers] = useState<Manager[]>([])
  const [loadingManagers, setLoadingManagers] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
  })

  const isHalfDay = watch("isHalfDay")

  useEffect(() => {
    if (open && user?.role === "EMPLOYEE") {
      fetchManagers()
    }
  }, [open, user?.role])

  const fetchManagers = async () => {
    try {
      setLoadingManagers(true)
      const response = await api.get("/leave/managers")
      if (response.data.success) {
        setManagers(response.data.data.managers)
      }
    } catch (error) {
      console.error("Failed to fetch managers:", error)
    } finally {
      setLoadingManagers(false)
    }
  }

  const onSubmit = async (data: LeaveRequestFormData) => {
    const result = await dispatch(createLeaveRequest(data))
    if (createLeaveRequest.fulfilled.match(result)) {
      reset()
      onOpenChange(false)
    }
  }

  if (user?.role === "MANAGER") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Access Restricted</DialogTitle>
            <DialogDescription>Managers cannot create leave requests</DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              As a manager, you can only approve or reject leave requests from employees. Only employees can submit
              leave requests.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Leave Request</DialogTitle>
          <DialogDescription>Submit a new leave request for approval</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave Type</Label>
            <Select onValueChange={(value) => setValue("leaveType", value as any)}>
              <SelectTrigger className={errors.leaveType ? "border-destructive" : ""}>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                <SelectItem value="SICK">Sick Leave</SelectItem>
                <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                <SelectItem value="PATERNITY">Paternity Leave</SelectItem>
                <SelectItem value="PERSONAL">Personal Leave</SelectItem>
                <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
              </SelectContent>
            </Select>
            {errors.leaveType && <p className="text-sm text-destructive">{errors.leaveType.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerId">Select Manager (Optional)</Label>
            <Select onValueChange={(value) => setValue("managerId", value)} disabled={loadingManagers}>
              <SelectTrigger>
                <SelectValue placeholder={loadingManagers ? "Loading managers..." : "Select a manager"} />
              </SelectTrigger>
              <SelectContent>
                {managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.firstName} {manager.lastName} ({manager.role})
                    {manager.department && ` - ${manager.department.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              If not selected, your request will be sent to the default approval workflow
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...register("startDate")}
                className={errors.startDate ? "border-destructive" : ""}
              />
              {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                disabled={isHalfDay}
                {...register("endDate")}
                className={errors.endDate ? "border-destructive" : ""}
              />
              {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isHalfDay"
              checked={isHalfDay}
              onCheckedChange={(checked) => {
                setValue("isHalfDay", checked as boolean)
                if (checked) {
                  const startDate = watch("startDate")
                  if (startDate) {
                    setValue("endDate", startDate)
                  }
                }
              }}
            />
            <Label htmlFor="isHalfDay" className="text-sm">
              Half day leave
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for your leave request"
              {...register("reason")}
              className={errors.reason ? "border-destructive" : ""}
            />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
