import { prisma } from '../lib/prisma';
import {
  CreateGameInput,
  UpdateGameInput,
  GameQuery,
  AddToRosterInput,
  LineupInput,
} from '../schemas/game.schema';
import { NotFoundError, ConflictError, ApiError } from '../middleware/error';
import { conflictService } from './conflict.service';
import { Prisma } from '@prisma/client';

const DEFAULT_GAME_DURATION_MS = 2.5 * 60 * 60 * 1000; // 2.5 hours

export class GameService {
  /**
   * Get all games with optional filtering
   */
  async findAll(query: GameQuery) {
    const where: Prisma.GameWhereInput = {};

    if (query.teamId) {
      where.teamId = query.teamId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.from || query.to) {
      where.startTime = {};
      if (query.from) {
        where.startTime.gte = new Date(query.from);
      }
      if (query.to) {
        where.startTime.lte = new Date(query.to);
      }
    }

    const games = await prisma.game.findMany({
      where,
      include: {
        team: {
          select: { id: true, name: true, shortName: true, primaryColor: true },
        },
        _count: {
          select: { roster: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return games.map((game) => ({
      ...game,
      rosterCount: game._count.roster,
      _count: undefined,
    }));
  }

  /**
   * Get single game by ID
   */
  async findById(id: string) {
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        team: true,
        roster: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                position: true,
                jerseyNumber: true,
                status: true,
              },
            },
          },
        },
        lineup: true,
        availabilities: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundError('Game');
    }

    return {
      ...game,
      roster: game.roster.map((r) => r.player),
      lineup: game.lineup ? JSON.parse(game.lineup.configuration) : null,
    };
  }

  /**
   * Create a new game
   */
  async create(data: CreateGameInput) {
    // Verify team exists
    const team = await prisma.team.findUnique({ where: { id: data.teamId } });
    if (!team) {
      throw new NotFoundError('Team');
    }

    const startTime = new Date(data.startTime);
    const endTime = data.endTime
      ? new Date(data.endTime)
      : new Date(startTime.getTime() + DEFAULT_GAME_DURATION_MS);

    const game = await prisma.game.create({
      data: {
        teamId: data.teamId,
        opponent: data.opponent,
        location: data.location,
        gameType: data.gameType,
        startTime,
        endTime,
        isHome: data.isHome,
      },
      include: {
        team: { select: { id: true, name: true, shortName: true } },
      },
    });

    return game;
  }

  /**
   * Update a game
   */
  async update(id: string, data: UpdateGameInput) {
    const existing = await prisma.game.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Game');
    }

    // If updating time, check for conflicts with rostered players
    if (data.startTime || data.endTime) {
      const newStartTime = data.startTime ? new Date(data.startTime) : existing.startTime;
      const newEndTime = data.endTime
        ? new Date(data.endTime)
        : data.startTime
          ? new Date(newStartTime.getTime() + DEFAULT_GAME_DURATION_MS)
          : existing.endTime;

      // Get all rostered players
      const roster = await prisma.gameRoster.findMany({
        where: { gameId: id },
        select: { playerId: true },
      });

      const playerIds = roster.map((r) => r.playerId);
      const conflicts = await conflictService.getPlayersWithConflicts(
        playerIds,
        newStartTime,
        newEndTime,
        id
      );

      if (conflicts.size > 0) {
        throw new ConflictError(
          `Cannot change game time: ${conflicts.size} rostered player(s) have conflicts`
        );
      }
    }

    const game = await prisma.game.update({
      where: { id },
      data: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
    });

    return game;
  }

  /**
   * Delete/cancel a game
   */
  async delete(id: string) {
    const existing = await prisma.game.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Game');
    }

    await prisma.game.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Add player to game roster
   */
  async addToRoster(gameId: string, data: AddToRosterInput) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundError('Game');
    }

    if (game.rosterLocked) {
      throw new ApiError(400, 'Roster is locked');
    }

    // Verify player exists and is on the team
    const teamPlayer = await prisma.teamPlayer.findFirst({
      where: {
        playerId: data.playerId,
        teamId: game.teamId,
        isActive: true,
      },
    });

    if (!teamPlayer) {
      throw new ApiError(400, 'Player is not on this team');
    }

    // Check for scheduling conflicts
    await conflictService.validateRosterAddition(data.playerId, gameId);

    // Check if already on roster
    const existing = await prisma.gameRoster.findUnique({
      where: {
        gameId_playerId: { gameId, playerId: data.playerId },
      },
    });

    if (existing) {
      throw new ConflictError('Player is already on the roster');
    }

    await prisma.gameRoster.create({
      data: {
        gameId,
        playerId: data.playerId,
      },
    });
  }

  /**
   * Remove player from game roster
   */
  async removeFromRoster(gameId: string, playerId: string) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundError('Game');
    }

    if (game.rosterLocked) {
      throw new ApiError(400, 'Roster is locked');
    }

    await prisma.gameRoster.delete({
      where: {
        gameId_playerId: { gameId, playerId },
      },
    });
  }

  /**
   * Lock roster for a game
   */
  async lockRoster(gameId: string) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundError('Game');
    }

    await prisma.game.update({
      where: { id: gameId },
      data: { rosterLocked: true },
    });
  }

  /**
   * Unlock roster for a game
   */
  async unlockRoster(gameId: string) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundError('Game');
    }

    await prisma.game.update({
      where: { id: gameId },
      data: { rosterLocked: false },
    });
  }

  /**
   * Set lineup for a game
   */
  async setLineup(gameId: string, data: LineupInput) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundError('Game');
    }

    const configuration = JSON.stringify(data);

    await prisma.lineup.upsert({
      where: { gameId },
      update: { configuration },
      create: { gameId, configuration },
    });
  }

  /**
   * Get lineup for a game
   */
  async getLineup(gameId: string) {
    const lineup = await prisma.lineup.findUnique({
      where: { gameId },
    });

    if (!lineup) {
      return null;
    }

    return JSON.parse(lineup.configuration);
  }
}

export const gameService = new GameService();
