import { Router, Response } from 'express';
import { authService } from '../services/auth.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginSchema, registerSchema, changePasswordSchema, publicRegisterSchema } from '../schemas/auth.schema';
import { adminOnly } from '../middleware/authorize';
import { config } from '../config/env';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Cookie options for JWT
const cookieOptions = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * POST /api/auth/signup
 * Public registration (requires admin approval)
 */
router.post(
  '/signup',
  authLimiter,
  validateBody(publicRegisterSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.publicRegister(req.body);
    res.status(201).json({
      message: 'Registration successful. Your account is pending approval by an administrator.',
      user,
    });
  }
);

/**
 * POST /api/auth/register
 * Register a new user (admin only, auto-approved)
 */
router.post(
  '/register',
  authenticate,
  adminOnly,
  validateBody(registerSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.register(req.body, req.user!.id);
    res.status(201).json(user);
  }
);

/**
 * POST /api/auth/login
 * Login and receive JWT in httpOnly cookie
 */
router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const { user, token } = await authService.login(req.body);
    res.cookie('token', token, cookieOptions);
    res.json({ user });
  }
);

/**
 * POST /api/auth/logout
 * Clear the auth cookie
 */
router.post('/logout', (_req, res: Response) => {
  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const profile = await authService.getProfile(req.user!.id);
  res.json(profile);
});

/**
 * POST /api/auth/change-password
 * Change current user's password
 */
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    await authService.changePassword(req.user!.id, req.body);
    res.json({ message: 'Password changed successfully' });
  }
);

/**
 * GET /api/auth/pending
 * Get all pending user registrations (admin only)
 */
router.get(
  '/pending',
  authenticate,
  adminOnly,
  async (_req: AuthenticatedRequest, res: Response) => {
    const users = await authService.getPendingUsers();
    res.json(users);
  }
);

/**
 * GET /api/auth/users
 * Get all users (admin only)
 */
router.get(
  '/users',
  authenticate,
  adminOnly,
  async (_req: AuthenticatedRequest, res: Response) => {
    const users = await authService.getAllUsers();
    res.json(users);
  }
);

/**
 * POST /api/auth/approve/:userId
 * Approve a pending user registration (admin only)
 */
router.post(
  '/approve/:userId',
  authenticate,
  adminOnly,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.approveUser(req.params.userId, req.user!.id);
    res.json({ message: 'User approved successfully', user });
  }
);

/**
 * DELETE /api/auth/reject/:userId
 * Reject a pending user registration (admin only)
 */
router.delete(
  '/reject/:userId',
  authenticate,
  adminOnly,
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await authService.rejectUser(req.params.userId);
    res.json(result);
  }
);

export default router;
