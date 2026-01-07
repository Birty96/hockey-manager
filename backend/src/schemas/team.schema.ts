import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  shortName: z.string().min(2, 'Short name must be 2-5 characters').max(5),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  leagueId: z.string().optional().nullable(),
});

export const updateTeamSchema = createTeamSchema.partial();

export const addPlayerToTeamSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddPlayerToTeamInput = z.infer<typeof addPlayerToTeamSchema>;
