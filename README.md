# 🏒 Hockey Team Manager

A full-stack web application for managing ice hockey teams that share a pool of players. Built with React, Node.js, Express, Prisma, and TypeScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Deployment Guides](#-deployment-guides)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)

## ✨ Features

### Core Functionality
- **Multi-Team Management**: Manage two teams that share a common pool of players
- **Player Roster**: Track player information, positions, jersey numbers, and availability
- **Game Scheduling**: Create and manage game schedules with home/away designations
- **Game Rosters**: Assign players to specific games with roster locking capabilities
- **Statistics Tracking**: Record goals, assists, plus/minus, penalty minutes, and more
- **Season Stats**: Automatic aggregation of player statistics across seasons

### User Management
- **Role-Based Access Control**: Admin, Coach, and Player roles with different permissions
- **User Registration Approval**: New users require admin approval before accessing the system
- **Secure Authentication**: JWT-based authentication with httpOnly cookies
- **Password Security**: Bcrypt hashing with configurable salt rounds

### User Interface
- **Dark Mode**: Full dark/light theme support with system preference detection
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS
- **Team Logos**: Upload and display custom team logos
- **Real-time Updates**: Dynamic dashboard with team and game statistics

## 🛠 Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **React Router v6** - Client-side routing
- **Lucide React** - Icon library
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM and database toolkit
- **SQLite** (dev) / **PostgreSQL** (prod) - Database
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **Cookie Parser** - Cookie handling

## 📁 Project Structure

```
hockey-manager/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   └── layout/      # Layout components (sidebar, header)
│   │   ├── context/         # React contexts (Auth, Theme)
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   └── types/           # TypeScript type definitions
│   ├── public/              # Static assets
│   └── package.json
│
├── backend/                  # Express backend application
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── middleware/      # Express middleware (auth, upload)
│   │   └── index.ts         # Application entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── uploads/             # Uploaded files (logos)
│   └── package.json
│
├── docs/                     # Documentation
│   ├── AI_SUMMARY.md        # AI/LLM context for future development
│   ├── GETTING_STARTED_DEV.md
│   ├── GETTING_STARTED_AZURE.md
│   └── GETTING_STARTED_ONPREM.md
│
└── README.md
```

## 🚀 Getting Started

See the detailed deployment guides for your target environment:

- [Development Setup](docs/GETTING_STARTED_DEV.md) - Local development machine
- [Azure Deployment](docs/GETTING_STARTED_AZURE.md) - Microsoft Azure cloud
- [On-Premises Deployment](docs/GETTING_STARTED_ONPREM.md) - Self-hosted servers
- [AI Summary](docs/AI_SUMMARY.md) - Context for AI-assisted development

### Quick Start (Development)

```bash
# Clone the repository
git clone <repository-url>
cd hockey-manager

# Backend setup
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

Access the application at `http://localhost:5173`

### Default Accounts

| Role  | Email                      | Password  |
|-------|----------------------------|-----------|
| Admin | admin@hockey.local         | admin123  |
| Coach | coach.wolves@hockey.local  | coach123  |
| Coach | coach.bears@hockey.local   | coach123  |

## 📚 API Documentation

### Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/signup` | User registration |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/pending` | Get pending users (Admin) |
| POST | `/api/auth/approve/:id` | Approve user (Admin) |
| DELETE | `/api/auth/reject/:id` | Reject user (Admin) |

### Team Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams` | List all teams |
| GET | `/api/teams/:id` | Get team details |
| POST | `/api/teams` | Create team (Admin) |
| PUT | `/api/teams/:id` | Update team (Admin/Coach) |
| POST | `/api/teams/:id/logo` | Upload team logo |

### Player Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/players` | List all players |
| GET | `/api/players/:id` | Get player details |
| POST | `/api/players` | Create player (Admin/Coach) |
| PUT | `/api/players/:id` | Update player (Admin/Coach) |
| DELETE | `/api/players/:id` | Delete player (Admin) |

### Game Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games` | List all games |
| GET | `/api/games/:id` | Get game details |
| POST | `/api/games` | Create game (Admin/Coach) |
| PUT | `/api/games/:id` | Update game (Admin/Coach) |
| POST | `/api/games/:id/roster` | Set game roster |

### Statistics Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats/team/:teamId` | Get team statistics |
| GET | `/api/stats/leaders/:stat` | Get stat leaders |
| POST | `/api/stats/game/:gameId` | Record game stats |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for hockey teams everywhere
