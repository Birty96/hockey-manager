import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../lib/prisma';

export interface JwtPayload {
  userId: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    playerId?: string | null;
  };
}

/**
 * Middleware to verify JWT token from httpOnly cookie
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.token;
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    // Fetch user from database to ensure they still exist and get current role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        player: { select: { id: true } },
      },
    });
    
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      playerId: user.player?.id || null,
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no token present
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.token;
    
    if (!token) {
      next();
      return;
    }
    
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        player: { select: { id: true } },
      },
    });
    
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        playerId: user.player?.id || null,
      };
    }
    
    next();
  } catch {
    // Token invalid but optional, continue without auth
    next();
  }
}
