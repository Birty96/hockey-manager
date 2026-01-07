import { prisma } from '../lib/prisma';
import { SetAvailabilityInput } from '../schemas/availability.schema';
import { NotFoundError } from '../middleware/error';

export class AvailabilityService {
  /**
   * Set player availability for a game
   */
  async setAvailability(playerId: string, gameId: string, data: SetAvailabilityInput) {
    // Verify game exists
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundError('Game');
    }

    // Verify player exists
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new NotFoundError('Player');
    }

    await prisma.playerAvailability.upsert({
      where: {
        playerId_gameId: { playerId, gameId },
      },
      update: {
        status: data.status,
        note: data.note,
        respondedAt: new Date(),
      },
      create: {
        playerId,
        gameId,
        status: data.status,
        note: data.note,
        respondedAt: new Date(),
      },
    });
  }

  /**
   * Get all availability responses for a game
   */
  async getGameAvailability(gameId: string) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundError('Game');
    }

    const availabilities = await prisma.playerAvailability.findMany({
      where: { gameId },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            jerseyNumber: true,
          },
        },
      },
      orderBy: { player: { lastName: 'asc' } },
    });

    return availabilities;
  }

  /**
   * Get player's availability for upcoming games
   */
  async getPlayerAvailability(playerId: string, upcoming: boolean = true) {
    const where: any = { playerId };

    if (upcoming) {
      where.game = {
        startTime: { gte: new Date() },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
      };
    }

    const availabilities = await prisma.playerAvailability.findMany({
      where,
      include: {
        game: {
          select: {
            id: true,
            opponent: true,
            startTime: true,
            location: true,
            team: { select: { name: true, shortName: true } },
          },
        },
      },
      orderBy: { game: { startTime: 'asc' } },
    });

    return availabilities;
  }

  /**
   * Get availability summary for a game
   */
  async getAvailabilitySummary(gameId: string) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        team: {
          include: {
            players: {
              where: { isActive: true },
              include: { player: true },
            },
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundError('Game');
    }

    const teamPlayerIds = game.team.players.map((tp) => tp.player.id);

    const availabilities = await prisma.playerAvailability.findMany({
      where: { gameId },
    });

    const responded = new Set(availabilities.map((a) => a.playerId));

    const summary = {
      total: teamPlayerIds.length,
      available: availabilities.filter((a) => a.status === 'AVAILABLE').length,
      unavailable: availabilities.filter((a) => a.status === 'UNAVAILABLE').length,
      maybe: availabilities.filter((a) => a.status === 'MAYBE').length,
      pending: teamPlayerIds.filter((id) => !responded.has(id)).length,
    };

    return summary;
  }
}

export const availabilityService = new AvailabilityService();
