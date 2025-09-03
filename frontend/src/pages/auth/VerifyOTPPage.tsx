"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAppDispatch, useAppSelector } from "../../hooks/redux"
import { verifyOTP, clearError } from "../../store/slices/authSlice"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { Loader2, Mail } from "lucide-react"
import api from "../../lib/api"
import toast from "react-hot-toast"

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
})

type OTPFormData = z.infer<typeof otpSchema>

export default function VerifyOTPPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector((state) => state.auth)
  const [email, setEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  })

  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) {
      setEmail(emailParam)
    } else {
      navigate("/auth/login")
    }
  }, [searchParams, navigate])

  useEffect(() => {
    return () => {
      dispatch(clearError())
    }
  }, [dispatch])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  const onSubmit = async (data: OTPFormData) => {
    const result = await dispatch(verifyOTP({ email, otp: data.otp }))
    if (verifyOTP.fulfilled.match(result)) {
      toast.success("Email verified successfully!")
      navigate("/auth/login")
    }
  }

  const handleResendOTP = async () => {
    if (resendTimer > 0) return

    setResendLoading(true)
    try {
      await api.post("/auth/resend-otp", { email })
      toast.success("OTP sent successfully!")
      setResendTimer(60)
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to resend OTP")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
        <CardDescription>
          We've sent a 6-digit verification code to
          <br />
          <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              placeholder="Enter 6-digit code"
              maxLength={6}
              className={`text-center text-lg tracking-widest ${errors.otp ? "border-destructive" : ""}`}
              {...register("otp")}
            />
            {errors.otp && <p className="text-sm text-destructive">{errors.otp.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResendOTP}
            disabled={resendLoading || resendTimer > 0}
            className="text-primary hover:text-primary/80"
          >
            {resendLoading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Sending...
              </>
            ) : resendTimer > 0 ? (
              `Resend in ${resendTimer}s`
            ) : (
              "Resend Code"
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link to="/auth/login" className="text-primary hover:text-primary/80 underline-offset-4 hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
