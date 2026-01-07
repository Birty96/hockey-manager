import { z } from 'zod';

export const createStatsSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  goals: z.number().int().min(0).optional().default(0),
  assists: z.number().int().min(0).optional().default(0),
  plusMinus: z.number().int().optional().default(0),
  pim: z.number().int().min(0).optional().default(0),
  shots: z.number().int().min(0).optional().default(0),
  // Goalie stats
  saves: z.number().int().min(0).optional(),
  goalsAgainst: z.number().int().min(0).optional(),
  shotsAgainst: z.number().int().min(0).optional(),
});

export const updateStatsSchema = createStatsSchema.omit({ playerId: true }).partial();

export type CreateStatsInput = z.infer<typeof createStatsSchema>;
export type UpdateStatsInput = z.infer<typeof updateStatsSchema>;
