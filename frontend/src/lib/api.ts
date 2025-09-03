import axios from "axios"
import toast from "react-hot-toast"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const message = error.response?.data?.error || "An error occurred"

    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      window.location.href = "/auth/login"
      toast.error("Session expired. Please login again.")
    } else if (error.response?.status >= 500) {
      toast.error("Server error. Please try again later.")
    } else {
      toast.error(message)
    }

    return Promise.reject(error)
  },
)

export default api
