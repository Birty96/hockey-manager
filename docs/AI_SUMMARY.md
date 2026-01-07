# 🤖 AI Development Summary

This document provides context for AI assistants (like GitHub Copilot, ChatGPT, Claude, etc.) to understand the Hockey Team Manager codebase for future development work.

## 📋 Project Overview

**Hockey Team Manager** is a full-stack web application designed for managing two ice hockey teams that share a common pool of players. The application handles player management, game scheduling, roster assignments, and statistics tracking.

### Business Logic Summary

1. **Shared Player Pool**: Players exist in a central pool and can be assigned to either team for specific games
2. **Game Rosters**: Each game has its own roster drawn from available players; rosters can be locked before game time
3. **Statistics**: Individual game stats aggregate into season totals automatically
4. **User Approval Flow**: New registrations require admin approval before login is permitted
5. **Role Hierarchy**: ADMIN > COACH > PLAYER with cascading permissions

## 🏗 Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  Express API    │────▶│  SQLite/Postgres│
│  (Port 5173)    │     │  (Port 3001)    │     │  Database       │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
   Tailwind CSS            Prisma ORM
   React Router            JWT Auth
   Axios                   Multer (uploads)
```

## 📁 Key Files Reference

### Backend Entry Points
- `backend/src/index.ts` - Express app setup, middleware, route mounting
- `backend/src/routes/auth.ts` - Authentication (login, signup, approval flow)
- `backend/src/routes/teams.ts` - Team CRUD and logo upload
- `backend/src/routes/players.ts` - Player management
- `backend/src/routes/games.ts` - Game scheduling and roster management
- `backend/src/routes/stats.ts` - Statistics recording and retrieval
- `backend/src/middleware/auth.ts` - JWT verification and role checking

### Frontend Entry Points
- `frontend/src/main.tsx` - App bootstrap with providers
- `frontend/src/App.tsx` - Route definitions
- `frontend/src/context/AuthContext.tsx` - Authentication state
- `frontend/src/context/ThemeContext.tsx` - Dark/light mode state
- `frontend/src/services/api.ts` - All API calls centralized
- `frontend/src/components/layout/Layout.tsx` - Main app shell

### Database Schema
- `backend/prisma/schema.prisma` - Complete data model

## 📊 Data Models

### Core Entities

```typescript
// User - Authentication and authorization
User {
  id, email, passwordHash, role (ADMIN|COACH|PLAYER),
  isApproved, approvedAt, approvedBy, playerId?
}

// Team - Hockey team
Team {
  id, name, shortName, primaryColor, secondaryColor,
  logoUrl, season, division
}

// Player - Individual player
Player {
  id, firstName, lastName, email, phone, dateOfBirth,
  jerseyNumber, position, shootsHand, status, userId?
}

// Game - Scheduled game
Game {
  id, teamId, opponent, startTime, location, isHome,
  gameType, status, homeScore, awayScore, rosterLocked
}

// GameRoster - Player assignment to game
GameRoster {
  id, gameId, playerId, attending, checkedIn
}

// GameStats - Per-game statistics
GameStats {
  id, gameId, playerId, goals, assists, plusMinus,
  pim, shots, hits, blockedShots, faceoffWins, faceoffLosses,
  timeOnIce, powerPlayGoals, shortHandedGoals, gameWinningGoal
}

// SeasonStats - Aggregated season statistics
SeasonStats {
  id, playerId, season, teamId, gamesPlayed, goals,
  assists, points, plusMinus, pim, ...
}
```

## 🔐 Authentication Flow

1. **Login**: POST `/api/auth/login` → validates credentials → checks `isApproved` → returns JWT in httpOnly cookie
2. **Signup**: POST `/api/auth/signup` → creates user with `isApproved: false` → waits for admin approval
3. **Approval**: Admin calls POST `/api/auth/approve/:id` → sets `isApproved: true`
4. **Session**: JWT stored in `token` cookie, verified by `authenticateToken` middleware

## 🎨 Frontend Patterns

### State Management
- **AuthContext**: User state, login/logout functions
- **ThemeContext**: Dark/light mode with localStorage persistence
- No Redux - using React Context for simplicity

### API Service Pattern
```typescript
// All API calls go through services/api.ts
export const playersApi = {
  getAll: () => api.get('/players').then(r => r.data),
  getById: (id: string) => api.get(`/players/${id}`).then(r => r.data),
  create: (data: CreatePlayerData) => api.post('/players', data).then(r => r.data),
  // ...
};
```

### Component Structure
- Pages in `src/pages/` - route-level components
- Reusable components in `src/components/`
- Layout wrapper in `src/components/layout/Layout.tsx`

### Dark Mode Implementation
- Tailwind's `darkMode: 'class'` strategy
- Theme toggle in header
- All components use `dark:` variant classes
- Persisted to localStorage, respects system preference

## 🚧 Known Limitations & Technical Debt

1. **No Real-time Updates**: Polling or WebSockets not implemented
2. **Basic Error Handling**: Could use more granular error types
3. **No Test Coverage**: Unit and integration tests not yet written
4. **File Upload**: Logos stored locally, should use cloud storage for production
5. **No Pagination**: Large datasets could cause performance issues
6. **No Email Notifications**: Approval notifications are not sent

## 🔮 Suggested Future Enhancements

### High Priority
1. **Email Integration**: Notifications for approvals, game reminders
2. **Push Notifications**: Game day alerts, roster changes
3. **Attendance Tracking**: Player check-in system for games
4. **Practice Scheduling**: Separate scheduling for team practices

### Medium Priority
5. **Player Statistics Charts**: Visual stats with charts/graphs
6. **Season Management**: Multiple seasons, playoffs bracket
7. **Export Features**: PDF rosters, CSV stat exports
8. **Mobile App**: React Native companion app
9. **Real-time Updates**: WebSocket for live game updates

### Lower Priority
10. **League Integration**: Multiple leagues/organizations
11. **Payment Tracking**: Team dues, fee management
12. **Equipment Management**: Jersey/equipment inventory
13. **Parent/Guardian Accounts**: For youth leagues
14. **Social Features**: Team chat, announcements

## 🛠 Development Commands

```bash
# Backend
cd backend
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm start            # Run compiled code
npx prisma studio    # Open database GUI
npx prisma migrate dev  # Run migrations

# Frontend
cd frontend
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run preview      # Preview production build
```

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL="file:./dev.db"           # SQLite for dev
# DATABASE_URL="postgresql://..."      # PostgreSQL for prod
JWT_SECRET="your-secret-key"
PORT=3001
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
```

## 📝 Code Style Guidelines

- **TypeScript**: Strict mode enabled, explicit types preferred
- **React**: Functional components with hooks only
- **Naming**: camelCase for variables, PascalCase for components
- **Files**: kebab-case for filenames
- **API Responses**: Consistent `{ data, error, message }` format
- **Error Handling**: Try-catch with proper HTTP status codes

## 🧪 Testing Strategy (To Be Implemented)

Recommended approach:
1. **Unit Tests**: Jest for utility functions, Prisma mocks for services
2. **Integration Tests**: Supertest for API endpoints
3. **E2E Tests**: Playwright or Cypress for critical user flows
4. **Component Tests**: React Testing Library

---

*Last updated: January 2026*
*For questions about this codebase, consult this document or the README.md*
