import { z } from 'zod';

export const setAvailabilitySchema = z.object({
  status: z.enum(['AVAILABLE', 'UNAVAILABLE', 'MAYBE']),
  note: z.string().max(500).optional(),
});

export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
