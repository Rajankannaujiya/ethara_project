# TaskFlow — Team Task Manager

A full-stack collaborative task management web application built with **React**, **Node.js**, **Prisma ORM**, and **PostgreSQL**.

> Think of it as a simplified Trello/Asana — create projects, invite team members, assign tasks, and track progress.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (JSON Web Tokens) |
| Deployment | Vercel |

---

## Features

- **User Authentication** — Signup / Login with secure bcrypt password hashing and JWT sessions
- **Project Management** — Create projects; creator becomes Admin; invite members by email
- **Role-Based Access Control**
  - **Admin**: full CRUD on tasks and members
  - **Member**: view and update status of assigned tasks only
- **Task Management** — Create tasks with Title, Description, Due Date, Priority (Low/Medium/High) and Status (To Do / In Progress / Done)
- **Kanban Board** — Visual board view grouped by status
- **Dashboard** — Total tasks, tasks by status, tasks per user, overdue count, recent tasks
- **Overdue Detection** — Highlighted overdue tasks throughout the UI

---

## Project Structure

```
team-task-manager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── migrations/          # SQL migrations
│   ├── src/
│   │   ├── index.js             # Express server
│   │   ├── lib/prisma.js        # Prisma client singleton
│   │   ├── middleware/auth.js   # JWT middleware
│   │   └── routes/
│   │       ├── auth.js          # /api/auth
│   │       ├── projects.js      # /api/projects
│   │       ├── tasks.js         # /api/tasks
│   │       └── dashboard.js     # /api/dashboard
│   ├── .env.example
│   ├── package.json
│   └── railway.toml
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Layout.jsx        # Sidebar layout
    │   ├── context/
    │   │   └── AuthContext.jsx   # Auth state
    │   ├── lib/api.js            # Axios client
    │   └── pages/
    │       ├── LoginPage.jsx
    │       ├── SignupPage.jsx
    │       ├── DashboardPage.jsx
    │       ├── ProjectsPage.jsx
    │       └── ProjectDetailPage.jsx
    ├── .env.example
    ├── package.json
    └── vite.config.js
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database running locally

### 1. Clone & Install

```bash
git clone https://github.com/your-username/team-task-manager
cd team-task-manager

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/team_task_manager"
JWT_SECRET="your-super-secret-key-change-this"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

### 3. Set Up Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Optional: open Prisma Studio to browse data
npx prisma studio
```

### 4. Start Backend

```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

### 5. Configure & Start Frontend

```bash
cd frontend
cp .env.example .env
# Leave VITE_API_URL empty for local (Vite proxy handles it)
npm run dev
# App starts at http://localhost:5173
```

---

## Deployment on Railway

### Backend

1. Create a new Railway project
2. Add a **PostgreSQL** plugin — Railway auto-sets `DATABASE_URL`
3. Deploy the `backend/` folder
4. Set environment variables:
   ```
   JWT_SECRET=your-secure-secret
   FRONTEND_URL=https://your-frontend.railway.app
   NODE_ENV=production
   ```
5. The `railway.toml` auto-runs migrations on deploy

### Frontend

1. Add a new service in the same Railway project
2. Deploy the `frontend/` folder
3. Set environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```
4. Set build command: `npm run build`
5. Set output directory: `dist`

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/projects` | List user's projects | Any |
| POST | `/api/projects` | Create project | Any |
| GET | `/api/projects/:id` | Get project details | Member |
| PUT | `/api/projects/:id` | Update project | Admin |
| DELETE | `/api/projects/:id` | Delete project | Admin |
| POST | `/api/projects/:id/members` | Add member by email | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Remove member | Admin |

### Tasks
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/tasks?projectId=` | List tasks | Admin: all, Member: assigned |
| POST | `/api/tasks` | Create task | Admin |
| GET | `/api/tasks/:id` | Get task | Admin / Assignee |
| PUT | `/api/tasks/:id` | Update task | Admin: full, Member: status only |
| DELETE | `/api/tasks/:id` | Delete task | Admin |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Global stats for user |
| GET | `/api/dashboard/project/:id` | Per-project stats |

---

## Database Schema

```
User ──< ProjectMember >── Project
                              │
                              └──< Task >── User (assignee)
```

- A **User** can own many projects and be a member of many
- A **Project** has members with roles (ADMIN / MEMBER)
- A **Task** belongs to a project and can be assigned to a user
- Cascading deletes keep data consistent

---

## Author

Built as part of a full-stack coding assignment. Estimated effort: ~10 hours.
