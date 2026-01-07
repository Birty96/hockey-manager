import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';

// Import routes
import authRoutes from './routes/auth.routes';
import playerRoutes from './routes/player.routes';
import teamRoutes from './routes/team.routes';
import gameRoutes from './routes/game.routes';
import statsRoutes from './routes/stats.routes';
import uploadRoutes from './routes/upload.routes';
import path from 'path';

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: config.isProd ? undefined : false, // Disable in dev for easier debugging
}));

// CORS
app.use(cors({
  origin: config.frontend.url,
  credentials: true, // Allow cookies
}));

// Body parsing
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve uploaded files (logos, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/stats', statsRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
