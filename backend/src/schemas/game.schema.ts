import { z } from 'zod';

export const createGameSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  opponent: z.string().min(1, 'Opponent name is required').max(100),
  location: z.string().min(1, 'Location is required').max(200),
  gameType: z.enum(['REGULAR', 'PLAYOFF', 'PRACTICE', 'SCRIMMAGE']).optional().default('REGULAR'),
  startTime: z.string().datetime('Invalid start time'),
  endTime: z.string().datetime('Invalid end time').optional(),
  isHome: z.boolean().optional().default(true),
});

export const updateGameSchema = z.object({
  opponent: z.string().min(1).max(100).optional(),
  location: z.string().min(1).max(200).optional(),
  gameType: z.enum(['REGULAR', 'PLAYOFF', 'PRACTICE', 'SCRIMMAGE']).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isHome: z.boolean().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']).optional(),
});

export const gameQuerySchema = z.object({
  teamId: z.string().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const addToRosterSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
});

export const lineupSchema = z.object({
  forwardLines: z.array(z.array(z.string())).optional(), // [[C, LW, RW], ...]
  defensePairs: z.array(z.array(z.string())).optional(), // [[LD, RD], ...]
  goalies: z.array(z.string()).optional(), // [G1, G2]
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
export type GameQuery = z.infer<typeof gameQuerySchema>;
export type AddToRosterInput = z.infer<typeof addToRosterSchema>;
export type LineupInput = z.infer<typeof lineupSchema>;
