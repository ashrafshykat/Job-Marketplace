# Marketplace Workflow System

A full-stack role-based project marketplace workflow system where projects are created by buyers and executed by problem solvers, with clear state transitions, task management, and delivery submission.

## 🎯 Features

### Role-Based Access Control
- **Admin**: Assign buyer roles, view all users and projects
- **Buyer**: Create projects, view requests, assign problem solvers, review submissions
- **Problem Solver**: Create profile, browse projects, request work, manage tasks, submit ZIP files

### Core Workflow
1. Admin assigns Buyer role to users
2. Buyer creates a project
3. Problem solvers request to work on the project
4. Buyer selects one problem solver
5. Project becomes assigned
6. Problem solver creates tasks/sub-modules with metadata
7. Problem solver submits ZIP file upon completion
8. Buyer reviews and accepts/rejects submission

### UI/UX Features
- Smooth animated transitions between states using Framer Motion
- Clear visual distinction between roles
- Step-by-step project lifecycle visualization
- Responsive, professional UI with Tailwind CSS
- Loading, error, and empty states handled properly

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Prisma** - ORM
- **JWT** - Authentication
- **Multer** - File upload handling
- **bcryptjs** - Password hashing

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB (local or cloud instance)
- Git

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd marketplace-workflow
```

### 1.5. Create Initial Admin User (Optional)

To create an admin user, you can:
1. Register a new user through the frontend
2. Manually update the user's role in MongoDB:
   ```javascript
   db.users.updateOne(
     { email: "your-email@example.com" },
     { $set: { role: "admin" } }
   )
   ```
3. Or use MongoDB Compass/CLI to update the role field

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Configuration

#### Backend (.env)
Create `backend/.env` file:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/marketplace?schema=public
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
NODE_ENV=development
UPLOAD_PATH=./uploads
```

**Note**: Replace `user`, `password`, and `localhost:5432` with your PostgreSQL credentials.

#### Frontend (.env.local)
Create `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Set Up PostgreSQL Database

**Option 1: Local PostgreSQL**
```bash
# Install PostgreSQL (if not installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: Download from postgresql.org

# Create database
createdb marketplace

# Or using psql
psql -U postgres
CREATE DATABASE marketplace;
```

**Option 2: Cloud PostgreSQL (Recommended)**
- Use services like:
  - [Supabase](https://supabase.com) (Free tier available)
  - [Neon](https://neon.tech) (Free tier available)
  - [Railway](https://railway.app) (Free tier available)
  - [ElephantSQL](https://www.elephantsql.com) (Free tier available)

Get the connection string and update `DATABASE_URL` in `backend/.env`

### 5. Run Database Migrations

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

This will create all the necessary tables in your PostgreSQL database.

### 6. Run the Application

#### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📚 API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/assign-buyer` - Assign buyer role (Admin only)
- `PUT /api/users/profile` - Update user profile

### Projects
- `POST /api/projects` - Create project (Buyer only)
- `GET /api/projects` - Get all projects (filtered by role)
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id/assign` - Assign problem solver (Buyer only)

### Requests
- `POST /api/requests` - Create request (Problem Solver only)
- `GET /api/requests` - Get all requests (filtered by role)
- `GET /api/requests/project/:projectId` - Get requests for a project

### Tasks
- `POST /api/tasks` - Create task (Problem Solver only)
- `GET /api/tasks` - Get all tasks (filtered by role)
- `GET /api/tasks/project/:projectId` - Get tasks for a project
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task

### Submissions
- `POST /api/submissions` - Submit ZIP file (Problem Solver only)
- `GET /api/submissions` - Get all submissions (filtered by role)
- `GET /api/submissions/task/:taskId` - Get submission for a task
- `PUT /api/submissions/:id/review` - Review submission (Buyer only)
- `GET /api/submissions/:id/download` - Download submission file

## 🏗️ Architecture

### Database Models (PostgreSQL)

#### User
- id (CUID), name, email, password (hashed)
- role: admin | buyer | problem_solver
- bio, skills (array), experience, portfolio

#### Project
- title, description
- buyer (User reference)
- assignedSolver (User reference)
- status: open | assigned | in_progress | completed

#### Request
- project (Project reference)
- solver (User reference)
- message
- status: pending | accepted | rejected

#### Task
- project (Project reference)
- title, description, deadline
- status: pending | in_progress | submitted | completed | rejected

#### Submission
- task (Task reference)
- project (Project reference)
- solver (User reference)
- filePath, fileName, fileSize
- message
- status: pending | accepted | rejected

### State Transitions

**Project Lifecycle:**
```
open → assigned → in_progress → completed
```

**Task Lifecycle:**
```
pending → in_progress → submitted → completed/rejected
```

**Request Lifecycle:**
```
pending → accepted/rejected
```

## 🎨 Key Features

### Animations
- Page transitions using Framer Motion
- Hover effects on interactive elements
- Loading states with spinners
- Success/error feedback with toast notifications
- Smooth state transitions for project/task status changes

### Security
- JWT-based authentication
- Password hashing with bcrypt
- Role-based route protection
- File upload validation (ZIP only)
- Request validation with express-validator

### User Experience
- Responsive design for all screen sizes
- Clear visual feedback for all actions
- Empty states with helpful messages
- Error handling with user-friendly messages
- File upload progress (basic)

## 🐳 Docker Deployment (Optional)

### Backend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Frontend Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm install --production
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 Development Notes

### File Upload
- Only ZIP files are accepted
- Files are stored in `backend/uploads/` directory
- Maximum file size: 50MB
- Files are served statically at `/uploads/:filename`

### Authentication
- Tokens are stored in localStorage
- Token expiration: 7 days (configurable)
- Automatic token refresh on API calls
- Logout clears all auth data

### Role Enforcement
- Frontend: Protected routes with role checks
- Backend: Middleware-based authorization
- API endpoints validate user roles

## 🚢 Deployment

### Backend Deployment
1. Set environment variables on hosting platform
2. Ensure MongoDB connection string is correct
3. Create `uploads` directory with write permissions
4. Deploy to platform (Heroku, Railway, Render, etc.)

### Frontend Deployment
1. Set `NEXT_PUBLIC_API_URL` to production backend URL
2. Build the application: `npm run build`
3. Deploy to platform (Vercel, Netlify, etc.)

### Recommended Platforms
- **Backend**: Railway, Render, Heroku
- **Frontend**: Vercel, Netlify
- **Database**: Supabase, Neon, Railway, ElephantSQL (all offer free PostgreSQL)

## 📄 License

MIT

## 👥 Author

Built for RacoAI Marketplace Projects Division Challenge

---

**Note**: This is a demonstration project. For production use, consider:
- Adding rate limiting
- Implementing file storage service (S3, Cloudinary)
- Adding comprehensive error logging
- Setting up CI/CD pipeline
- Adding unit and integration tests
- Implementing real-time notifications
- Adding email notifications

