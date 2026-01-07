import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

// Role constants (matching schema.prisma valid values)
export const Role = {
  ADMIN: 'ADMIN',
  COACH: 'COACH',
  PLAYER: 'PLAYER',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

/**
 * Middleware to require specific roles for access
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
}

/**
 * Admin only access
 */
export const adminOnly = requireRole(Role.ADMIN);

/**
 * Coach or Admin access
 */
export const coachOrAdmin = requireRole(Role.ADMIN, Role.COACH);

/**
 * Any authenticated user
 */
export const anyRole = requireRole(Role.ADMIN, Role.COACH, Role.PLAYER);

/**
 * Middleware to check if user can access a specific player's data
 * Players can only access their own data; coaches/admins can access any
 */
export function canAccessPlayer(playerIdParam: string = 'id') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const targetPlayerId = req.params[playerIdParam];
    
    // Admins and coaches can access any player
    if (req.user.role === Role.ADMIN || req.user.role === Role.COACH) {
      next();
      return;
    }
    
    // Players can only access their own profile
    if (req.user.role === Role.PLAYER && req.user.playerId === targetPlayerId) {
      next();
      return;
    }
    
    res.status(403).json({ error: 'You can only access your own data' });
  };
}
