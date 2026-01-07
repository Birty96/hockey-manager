import { Router, Response } from 'express';
import { statsService } from '../services/stats.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateStatsSchema } from '../schemas/stats.schema';
import { coachOrAdmin } from '../middleware/authorize';

const router = Router();

/**
 * PATCH /api/stats/:id
 * Update a stat entry
 */
router.patch(
  '/:id',
  authenticate,
  coachOrAdmin,
  validateBody(updateStatsSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const stats = await statsService.updateStats(req.params.id, req.body);
    res.json(stats);
  }
);

/**
 * GET /api/stats/leaders
 * Get league leaders
 */
router.get('/leaders', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const stat = (req.query.stat as 'goals' | 'assists' | 'points' | 'pim') || 'points';
  const limit = parseInt(req.query.limit as string) || 10;
  const leaders = await statsService.getLeaders(stat, limit);
  res.json(leaders);
});

/**
 * GET /api/stats/team/:teamId
 * Get team season stats
 */
router.get('/team/:teamId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const stats = await statsService.getTeamSeasonStats(req.params.teamId);
  res.json(stats);
});

export default router;
