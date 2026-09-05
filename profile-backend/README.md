# Student Database Management System - Backend

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/student_database
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Run the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user (requires auth)

### Students
- GET `/api/students` - Get all students
- GET `/api/students/:id` - Get single student
- GET `/api/students/code/:student_id` - Get student by student ID
- POST `/api/students` - Create student (Admin only)
- PUT `/api/students/:id` - Update student
- DELETE `/api/students/:id` - Delete student (Admin only)

### Alumni
- GET `/api/alumni` - Get all alumni
- GET `/api/alumni/:id` - Get single alumni
- POST `/api/alumni` - Create alumni (Admin only)
- PUT `/api/alumni/:id` - Update alumni
- DELETE `/api/alumni/:id` - Delete alumni (Admin only)

### Projects
- GET `/api/projects` - Get all projects
- GET `/api/projects/:id` - Get single project
- GET `/api/projects/student/:studentId` - Get projects by student
- POST `/api/projects` - Create project
- PUT `/api/projects/:id` - Update project
- DELETE `/api/projects/:id` - Delete project (Admin only)

### Advisors
- GET `/api/advisors` - Get all advisors
- GET `/api/advisors/:id` - Get single advisor
- POST `/api/advisors` - Create advisor (Admin only)
- PUT `/api/advisors/:id` - Update advisor (Admin only)
- DELETE `/api/advisors/:id` - Delete advisor (Admin only)

### Dashboard
- GET `/api/dashboard/stats` - Get dashboard statistics
- GET `/api/dashboard/alumni-by-faculty` - Get alumni count by faculty
- GET `/api/dashboard/alumni-by-year` - Get alumni count by year
- GET `/api/dashboard/students-by-faculty` - Get students count by faculty
- GET `/api/dashboard/recent-alumni` - Get recently updated alumni
- GET `/api/dashboard/awarded-projects` - Get projects with awards

### Import/Export
- POST `/api/data/import/students` - Import students from CSV/Excel (Admin only)
- GET `/api/data/export/students` - Export students (Admin only)
- GET `/api/data/export/alumni` - Export alumni (Admin only)
- GET `/api/data/export/projects` - Export projects (Admin only)
- GET `/api/data/template/:type` - Download import template (Admin only)

## User Roles
- `admin` - Full access to all features
- `student` - Can view and manage own projects
- `teacher` - Can view students and projects
- `alumni` - Can update own profile

## Features
- JWT authentication
- Role-based access control
- Data validation
- Search and filtering
- Import/Export (CSV, Excel)
- Dashboard statistics
- File upload support
