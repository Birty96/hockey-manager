import { prisma } from '../lib/prisma';
import { ConflictError } from '../middleware/error';

const DEFAULT_GAME_DURATION_MS = 2.5 * 60 * 60 * 1000; // 2.5 hours

export class ConflictService {
  /**
   * Check if a player has any scheduling conflicts with a proposed game time
   * Returns the conflicting game if found, null otherwise
   */
  async checkPlayerConflict(
    playerId: string,
    startTime: Date,
    endTime: Date,
    excludeGameId?: string
  ) {
    const conflictingRoster = await prisma.gameRoster.findFirst({
      where: {
        playerId,
        game: {
          id: excludeGameId ? { not: excludeGameId } : undefined,
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
          OR: [
            // New game starts during existing game
            {
              startTime: { lte: startTime },
              endTime: { gt: startTime },
            },
            // New game ends during existing game
            {
              startTime: { lt: endTime },
              endTime: { gte: endTime },
            },
            // New game completely contains existing game
            {
              startTime: { gte: startTime },
              endTime: { lte: endTime },
            },
          ],
        },
      },
      include: {
        game: {
          select: {
            id: true,
            opponent: true,
            startTime: true,
            team: { select: { name: true } },
          },
        },
      },
    });

    return conflictingRoster?.game || null;
  }

  /**
   * Validate that a player can be added to a game roster
   * Throws ConflictError if there's a scheduling conflict
   */
  async validateRosterAddition(playerId: string, gameId: string): Promise<void> {
    // Get the game details
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { startTime: true, endTime: true },
    });

    if (!game) {
      return; // Game validation handled elsewhere
    }

    const conflict = await this.checkPlayerConflict(
      playerId,
      game.startTime,
      game.endTime,
      gameId
    );

    if (conflict) {
      throw new ConflictError(
        `Player is already rostered for ${conflict.team.name} vs ${conflict.opponent} ` +
          `at ${conflict.startTime.toISOString()}`
      );
    }
  }

  /**
   * Calculate game end time from start time
   */
  calculateEndTime(startTime: Date, durationMs: number = DEFAULT_GAME_DURATION_MS): Date {
    return new Date(startTime.getTime() + durationMs);
  }

  /**
   * Get all players with conflicts for a given time range
   */
  async getPlayersWithConflicts(
    playerIds: string[],
    startTime: Date,
    endTime: Date,
    excludeGameId?: string
  ): Promise<Map<string, { gameId: string; opponent: string; teamName: string }>> {
    const conflicts = new Map<string, { gameId: string; opponent: string; teamName: string }>();

    for (const playerId of playerIds) {
      const conflict = await this.checkPlayerConflict(playerId, startTime, endTime, excludeGameId);
      if (conflict) {
        conflicts.set(playerId, {
          gameId: conflict.id,
          opponent: conflict.opponent,
          teamName: conflict.team.name,
        });
      }
    }

    return conflicts;
  }
}

export const conflictService = new ConflictService();
