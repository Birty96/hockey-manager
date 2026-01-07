import { Router, Response } from 'express';
import { gameService } from '../services/game.service';
import { availabilityService } from '../services/availability.service';
import { statsService } from '../services/stats.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createGameSchema,
  updateGameSchema,
  gameQuerySchema,
  addToRosterSchema,
  lineupSchema,
} from '../schemas/game.schema';
import { setAvailabilitySchema } from '../schemas/availability.schema';
import { createStatsSchema } from '../schemas/stats.schema';
import { coachOrAdmin, anyRole } from '../middleware/authorize';

const router = Router();

/**
 * GET /api/games
 * List all games (with optional filters)
 */
router.get(
  '/',
  authenticate,
  validateQuery(gameQuerySchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const games = await gameService.findAll(req.query as any);
    res.json(games);
  }
);

/**
 * GET /api/games/:id
 * Get single game with details
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const game = await gameService.findById(req.params.id);
  res.json(game);
});

/**
 * POST /api/games
 * Create new game (coach or admin)
 */
router.post(
  '/',
  authenticate,
  coachOrAdmin,
  validateBody(createGameSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const game = await gameService.create(req.body);
    res.status(201).json(game);
  }
);

/**
 * PATCH /api/games/:id
 * Update game (coach or admin)
 */
router.patch(
  '/:id',
  authenticate,
  coachOrAdmin,
  validateBody(updateGameSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const game = await gameService.update(req.params.id, req.body);
    res.json(game);
  }
);

/**
 * DELETE /api/games/:id
 * Cancel game (coach or admin)
 */
router.delete(
  '/:id',
  authenticate,
  coachOrAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    await gameService.delete(req.params.id);
    res.status(204).send();
  }
);

// ============ ROSTER ============

/**
 * POST /api/games/:id/roster
 * Add player to game roster
 */
router.post(
  '/:id/roster',
  authenticate,
  coachOrAdmin,
  validateBody(addToRosterSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    await gameService.addToRoster(req.params.id, req.body);
    res.status(201).json({ message: 'Player added to roster' });
  }
);

/**
 * DELETE /api/games/:id/roster/:playerId
 * Remove player from roster
 */
router.delete(
  '/:id/roster/:playerId',
  authenticate,
  coachOrAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    await gameService.removeFromRoster(req.params.id, req.params.playerId);
    res.status(204).send();
  }
);

/**
 * POST /api/games/:id/lock
 * Lock game roster
 */
router.post(
  '/:id/lock',
  authenticate,
  coachOrAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    await gameService.lockRoster(req.params.id);
    res.json({ message: 'Roster locked' });
  }
);

/**
 * POST /api/games/:id/unlock
 * Unlock game roster
 */
router.post(
  '/:id/unlock',
  authenticate,
  coachOrAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    await gameService.unlockRoster(req.params.id);
    res.json({ message: 'Roster unlocked' });
  }
);

// ============ LINEUP ============

/**
 * GET /api/games/:id/lineup
 * Get game lineup
 */
router.get('/:id/lineup', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const lineup = await gameService.getLineup(req.params.id);
  res.json(lineup);
});

/**
 * PUT /api/games/:id/lineup
 * Set game lineup
 */
router.put(
  '/:id/lineup',
  authenticate,
  coachOrAdmin,
  validateBody(lineupSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    await gameService.setLineup(req.params.id, req.body);
    res.json({ message: 'Lineup saved' });
  }
);

// ============ AVAILABILITY ============

/**
 * GET /api/games/:id/availability
 * Get all availability responses for a game
 */
router.get(
  '/:id/availability',
  authenticate,
  coachOrAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const availability = await availabilityService.getGameAvailability(req.params.id);
    res.json(availability);
  }
);

/**
 * GET /api/games/:id/availability/summary
 * Get availability summary for a game
 */
router.get(
  '/:id/availability/summary',
  authenticate,
  coachOrAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const summary = await availabilityService.getAvailabilitySummary(req.params.id);
    res.json(summary);
  }
);

/**
 * PUT /api/games/:id/availability
 * Set own availability for a game (any authenticated user with a player profile)
 */
router.put(
  '/:id/availability',
  authenticate,
  anyRole,
  validateBody(setAvailabilitySchema),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.playerId) {
      res.status(403).json({ error: 'You must have a player profile to set availability' });
      return;
    }
    await availabilityService.setAvailability(req.user.playerId, req.params.id, req.body);
    res.json({ message: 'Availability saved' });
  }
);

// ============ STATS ============

/**
 * GET /api/games/:id/stats
 * Get all stats for a game
 */
router.get('/:id/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const stats = await statsService.getGameStats(req.params.id);
  res.json(stats);
});

/**
 * POST /api/games/:id/stats
 * Record player stats for a game
 */
router.post(
  '/:id/stats',
  authenticate,
  coachOrAdmin,
  validateBody(createStatsSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const stats = await statsService.createGameStats(req.params.id, req.body);
    res.status(201).json(stats);
  }
);

export default router;
