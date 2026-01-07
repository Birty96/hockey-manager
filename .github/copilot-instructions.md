# Hockey Team Manager - Development Instructions

## Project Overview
Full-stack ice hockey team management application for two teams sharing a player pool.

## Tech Stack
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Database**: PostgreSQL (SQLite for development)
- **Auth**: JWT with httpOnly cookies + bcrypt

## Project Structure
```
hockey-manager/
├── backend/           # Express API server
│   ├── prisma/        # Database schema and migrations
│   └── src/           # TypeScript source code
├── frontend/          # React SPA
│   └── src/           # React components and pages
└── .env.example       # Environment template
```

## Security Requirements
- All passwords hashed with bcrypt (cost factor 12)
- JWT stored in httpOnly secure cookies
- CSRF protection enabled
- Rate limiting on auth endpoints
- Input validation with Zod
- Helmet security headers

## Roles
- ADMIN: Full system access
- COACH: Manage players, games, lineups for their teams
- PLAYER: View own profile and availability

## Running the Project
1. Copy `.env.example` to `.env` and configure
2. `cd backend && npm install && npx prisma migrate dev`
3. `cd frontend && npm install`
4. Backend: `npm run dev` (port 3001)
5. Frontend: `npm run dev` (port 5173)
