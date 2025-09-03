"use client"

import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "../../hooks/redux"
import { fetchUsers } from "../../store/slices/userSlice"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Users, Mail, Phone, Calendar } from "lucide-react"
import { formatDate } from "../../lib/utils"

export default function UsersPage() {
  const dispatch = useAppDispatch()
  const { users, isLoading } = useAppSelector((state) => state.user)

  useEffect(() => {
    dispatch(fetchUsers())
  }, [dispatch])

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "destructive"
      case "HR":
        return "default"
      case "MANAGER":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">Manage system users and their roles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>View and manage all system users</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <div key={user.id} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.profileImage || "/placeholder.svg"} />
                      <AvatarFallback>
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium truncate">
                          {user.firstName} {user.lastName}
                        </h3>
                        <Badge variant={getRoleBadgeVariant(user.role) as any}>{user.role}</Badge>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          <span className="truncate">{user.email}</span>
                        </div>

                        {user.phoneNumber && (
                          <div className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            <span>{user.phoneNumber}</span>
                          </div>
                        )}

                        {user.department && (
                          <div className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            <span>{user.department.name}</span>
                          </div>
                        )}

                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>Joined {formatDate(user.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mt-2">
                        <div className={`w-2 h-2 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="text-xs text-muted-foreground">{user.isActive ? "Active" : "Inactive"}</span>
                        {user.isEmailVerified && (
                          <>
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-xs text-muted-foreground">Verified</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
