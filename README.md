# Leave Management System

A comprehensive full-stack leave management application built with React.js frontend and Node.js/Express.js backend.

## 🚀 Features

### Authentication & Security
- **Secure Registration & Login** with email verification via OTP
- **Role-based Access Control** (Employee, Manager, HR, Admin)
- **Password Reset** functionality with email verification
- **JWT Authentication** with Redis session management
- **Rate Limiting** and comprehensive security middleware

### Leave Management
- **Leave Request Submission** with multiple leave types
- **Approval Workflows** for managers and HR
- **Leave Balance Tracking** with automatic calculations
- **Calendar Integration** with conflict detection
- **File Attachments** support via Cloudinary

### Dashboard & Analytics
- **Personalized Dashboards** for different user roles
- **Leave Analytics** and reporting
- **Team Management** for managers
- **Audit Logging** for compliance

## 🛠 Tech Stack

### Frontend
- **React.js 18** with TypeScript
- **Vite** for fast development and building
- **Redux Toolkit** for state management
- **React Router** for client-side routing
- **React Hook Form** with Zod validation
- **Tailwind CSS** for styling
- **Radix UI** components

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Prisma ORM** with MySQL database
- **Redis** for session management
- **JWT** for authentication
- **Cloudinary** for file uploads
- **Nodemailer** with Mailtrap for emails

### Security & DevOps
- **Helmet** for security headers
- **CORS** configuration
- **Rate Limiting** with Redis
- **Docker** containerization
- **PM2** for process management
- **Winston** for logging

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MySQL 8+
- Redis 6+



# Clone the repository
git clone <repository-url>
cd leave-management-system



# frontend setup
cd frontend

# Set up environment variables
cp frontend/.env.sample frontend/.env

# Install dependencies
npm install

# Start the development server
npm run dev





# backend setup
cd backend

# Set up environment variables
cp backend/.env.sample backend/.env

# Install dependencies
npm install

# Start the development server
npm run dev



# Set up environment variables in .env 

# Database
DATABASE_URL="mysql://user:password@localhost:3306/leave_management"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Email (Mailtrap)
MAILTRAP_HOST="sandbox.smtp.mailtrap.io"
MAILTRAP_PORT="2525"
MAILTRAP_USER="your-mailtrap-user"
MAILTRAP_PASS="your-mailtrap-password"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Server
PORT="5000"
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"



## 📱 Usage

### For Employees
1. **Register** with company email and verify via OTP
2. **Submit Leave Requests** with required details
3. **Track Request Status** in real-time
4. **View Leave Balance** and history
5. **Upload Supporting Documents** when needed

### For Managers
1. **Review Team Requests** in approval dashboard
2. **Approve/Reject** with comments
3. **View Team Analytics** and leave patterns
4. **Manage Team Members** and their balances





## 📊 API Documentation

The backend provides RESTful APIs with the following main endpoints:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation

### Leave Management
- `GET /api/leave/requests` - Get user's leave requests
- `POST /api/leave/requests` - Submit new leave request
- `PUT /api/leave/requests/:id` - Update leave request
- `DELETE /api/leave/requests/:id` - Cancel leave request

### Approvals (Manager/HR)
- `GET /api/leave/approvals` - Get pending approvals
- `POST /api/leave/approvals/:id/approve` - Approve request
- `POST /api/leave/approvals/:id/reject` - Reject request




Built with ❤️ for modern workforce management
