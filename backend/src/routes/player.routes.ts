import { Router, Response } from 'express';
import { playerService } from '../services/player.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createPlayerSchema,
  updatePlayerSchema,
  playerQuerySchema,
} from '../schemas/player.schema';
import { adminOnly, coachOrAdmin, canAccessPlayer } from '../middleware/authorize';

const router = Router();

/**
 * GET /api/players
 * List all players (with optional filters)
 */
router.get(
  '/',
  authenticate,
  coachOrAdmin,
  validateQuery(playerQuerySchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const players = await playerService.findAll(req.query as any);
    res.json(players);
  }
);

/**
 * GET /api/players/:id
 * Get single player
 */
router.get(
  '/:id',
  authenticate,
  canAccessPlayer('id'),
  async (req: AuthenticatedRequest, res: Response) => {
    const player = await playerService.findById(req.params.id);
    res.json(player);
  }
);

/**
 * POST /api/players
 * Create new player (admin only)
 */
router.post(
  '/',
  authenticate,
  adminOnly,
  validateBody(createPlayerSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const player = await playerService.create(req.body);
    res.status(201).json(player);
  }
);

/**
 * PATCH /api/players/:id
 * Update player (admin only)
 */
router.patch(
  '/:id',
  authenticate,
  adminOnly,
  validateBody(updatePlayerSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const player = await playerService.update(req.params.id, req.body);
    res.json(player);
  }
);

/**
 * DELETE /api/players/:id
 * Soft delete player (admin only)
 */
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  async (req: AuthenticatedRequest, res: Response) => {
    await playerService.delete(req.params.id);
    res.status(204).send();
  }
);

/**
 * GET /api/players/:id/stats
 * Get player statistics
 */
router.get(
  '/:id/stats',
  authenticate,
  canAccessPlayer('id'),
  async (req: AuthenticatedRequest, res: Response) => {
    const teamId = req.query.teamId as string | undefined;
    const stats = await playerService.getStats(req.params.id, teamId);
    res.json(stats);
  }
);

export default router;
