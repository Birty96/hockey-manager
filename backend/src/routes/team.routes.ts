import { Router, Response } from 'express';
import { teamService } from '../services/team.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createTeamSchema,
  updateTeamSchema,
  addPlayerToTeamSchema,
} from '../schemas/team.schema';
import { adminOnly, coachOrAdmin } from '../middleware/authorize';

const router = Router();

/**
 * GET /api/teams
 * List all teams
 */
router.get('/', authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  const teams = await teamService.findAll();
  res.json(teams);
});

/**
 * GET /api/teams/:id
 * Get single team with details
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const team = await teamService.findById(req.params.id);
  res.json(team);
});

/**
 * POST /api/teams
 * Create new team (admin only)
 */
router.post(
  '/',
  authenticate,
  adminOnly,
  validateBody(createTeamSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const team = await teamService.create(req.body);
    res.status(201).json(team);
  }
);

/**
 * PATCH /api/teams/:id
 * Update team (admin only)
 */
router.patch(
  '/:id',
  authenticate,
  adminOnly,
  validateBody(updateTeamSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const team = await teamService.update(req.params.id, req.body);
    res.json(team);
  }
);

/**
 * GET /api/teams/:id/players
 * Get all players on a team
 */
router.get('/:id/players', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const players = await teamService.getPlayers(req.params.id);
  res.json(players);
});

/**
 * POST /api/teams/:id/players
 * Add player to team (coach or admin)
 */
router.post(
  '/:id/players',
  authenticate,
  coachOrAdmin,
  validateBody(addPlayerToTeamSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    await teamService.addPlayer(req.params.id, req.body);
    res.status(201).json({ message: 'Player added to team' });
  }
);

/**
 * DELETE /api/teams/:id/players/:playerId
 * Remove player from team (coach or admin)
 */
router.delete(
  '/:id/players/:playerId',
  authenticate,
  coachOrAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    await teamService.removePlayer(req.params.id, req.params.playerId);
    res.status(204).send();
  }
);

/**
 * GET /api/teams/:id/stats
 * Get team aggregate statistics
 */
router.get('/:id/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const stats = await teamService.getStats(req.params.id);
  res.json(stats);
});

export default router;
