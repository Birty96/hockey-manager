# 💻 Development Machine Setup

This guide walks you through setting up the Hockey Team Manager on your local development machine.

## Prerequisites

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** 9.x or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Code Editor** (VS Code recommended)

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd hockey-manager
```

## Step 2: Backend Setup

### 2.1 Install Dependencies

```bash
cd backend
npm install
```

### 2.2 Configure Environment

Create a `.env` file in the `backend` directory:

```env
# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# JWT Secret (change this!)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 2.3 Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Create database and apply schema
npx prisma db push

# (Optional) Seed with sample data
npx prisma db seed
```

### 2.4 Start Backend Server

```bash
npm run dev
```

The backend will start on `http://localhost:3001`

## Step 3: Frontend Setup

Open a **new terminal** window/tab:

### 3.1 Install Dependencies

```bash
cd frontend
npm install
```

### 3.2 Configure Environment (Optional)

Create a `.env` file in the `frontend` directory if you need to customize the API URL:

```env
VITE_API_URL=http://localhost:3001/api
```

### 3.3 Start Frontend Dev Server

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## Step 4: Access the Application

1. Open your browser to `http://localhost:5173`
2. Login with a default account:

| Role  | Email                      | Password  |
|-------|----------------------------|-----------|
| Admin | admin@hockey.local         | admin123  |
| Coach | coach.wolves@hockey.local  | coach123  |
| Coach | coach.bears@hockey.local   | coach123  |

## Development Tools

### Prisma Studio (Database GUI)

```bash
cd backend
npx prisma studio
```

Opens a web interface at `http://localhost:5555` to browse/edit data.

### VS Code Extensions (Recommended)

- **Prisma** - Schema highlighting and formatting
- **Tailwind CSS IntelliSense** - CSS class autocomplete
- **ES7+ React/Redux/React-Native snippets** - Code snippets
- **TypeScript Importer** - Auto-import suggestions
- **Error Lens** - Inline error display

### Useful Commands

```bash
# Backend
npm run dev           # Start with hot reload
npm run build         # Compile TypeScript
npm run lint          # Run ESLint
npx prisma migrate dev --name <name>  # Create migration
npx prisma db push    # Quick schema sync (dev only)

# Frontend
npm run dev           # Start Vite dev server
npm run build         # Production build
npm run preview       # Preview production build
npm run lint          # Run ESLint
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3001
kill -9 <PID>
```

### Database Issues

```bash
# Reset database completely
cd backend
rm prisma/dev.db
npx prisma db push
npx prisma db seed
```

### Node Module Issues

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Prisma Client Out of Sync

```bash
npx prisma generate
```

## Project Structure

```
hockey-manager/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── routes/           # API routes
│   │   └── middleware/       # Auth middleware
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── dev.db            # SQLite database
│   ├── uploads/              # File uploads
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx          # Entry point
│   │   ├── App.tsx           # Routes
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── context/          # React contexts
│   │   ├── services/         # API services
│   │   └── types/            # TypeScript types
│   └── package.json
│
└── docs/                     # Documentation
```

## Next Steps

- Read the [AI Summary](AI_SUMMARY.md) to understand the codebase
- Check out the [API documentation](../README.md#-api-documentation)
- Start building new features!

---

*Having issues? Check the GitHub Issues page or consult the AI_SUMMARY.md for technical details.*
