import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/authorize';
import { z } from 'zod';

const router = Router();

const createLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  shortName: z.string().min(1).max(10),
  description: z.string().optional(),
});

const updateLeagueSchema = createLeagueSchema.partial();

/**
 * GET /api/leagues
 * List all leagues
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const leagues = await prisma.league.findMany({
      include: {
        _count: {
          select: { teams: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    res.json(leagues.map(l => ({
      ...l,
      teamCount: l._count.teams,
      _count: undefined,
    })));
  }
);

/**
 * GET /api/leagues/:id
 * Get single league with teams
 */
router.get(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        teams: {
          include: {
            _count: {
              select: { players: true, games: true },
            },
          },
        },
      },
    });

    if (!league) {
      res.status(404).json({ error: 'League not found' });
      return;
    }

    res.json(league);
  }
);

/**
 * POST /api/leagues
 * Create new league (admin only)
 */
router.post(
  '/',
  authenticate,
  adminOnly,
  async (req: AuthenticatedRequest, res: Response) => {
    const data = createLeagueSchema.parse(req.body);

    const league = await prisma.league.create({
      data,
    });

    res.status(201).json(league);
  }
);

/**
 * PATCH /api/leagues/:id
 * Update league (admin only)
 */
router.patch(
  '/:id',
  authenticate,
  adminOnly,
  async (req: AuthenticatedRequest, res: Response) => {
    const data = updateLeagueSchema.parse(req.body);

    const league = await prisma.league.update({
      where: { id: req.params.id },
      data,
    });

    res.json(league);
  }
);

/**
 * DELETE /api/leagues/:id
 * Delete league (admin only)
 */
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  async (req: AuthenticatedRequest, res: Response) => {
    await prisma.league.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  }
);

export default router;
