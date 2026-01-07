import { z } from 'zod';

export const createPlayerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  position: z.enum(['CENTER', 'LEFT_WING', 'RIGHT_WING', 'DEFENSE', 'GOALIE']),
  jerseyNumber: z.number().int().min(0).max(99).optional(),
  status: z.enum(['ACTIVE', 'INJURED', 'UNAVAILABLE', 'INACTIVE']).optional().default('ACTIVE'),
  dateOfBirth: z.string().datetime().optional(),
  phone: z.string().max(20).optional(),
  emergencyContact: z.string().max(100).optional(),
});

export const updatePlayerSchema = createPlayerSchema.partial();

export const playerQuerySchema = z.object({
  teamId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INJURED', 'UNAVAILABLE', 'INACTIVE']).optional(),
  position: z.enum(['CENTER', 'LEFT_WING', 'RIGHT_WING', 'DEFENSE', 'GOALIE']).optional(),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
export type PlayerQuery = z.infer<typeof playerQuerySchema>;
