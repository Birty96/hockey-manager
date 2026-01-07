import { prisma } from '../lib/prisma';
import { CreatePlayerInput, UpdatePlayerInput, PlayerQuery } from '../schemas/player.schema';
import { NotFoundError } from '../middleware/error';
import { Prisma } from '@prisma/client';

export class PlayerService {
  /**
   * Get all players with optional filtering
   */
  async findAll(query: PlayerQuery) {
    const where: Prisma.PlayerWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.position) {
      where.position = query.position;
    }

    if (query.teamId) {
      where.teamMemberships = {
        some: { teamId: query.teamId, isActive: true },
      };
    }

    const players = await prisma.player.findMany({
      where,
      include: {
        teamMemberships: {
          where: { isActive: true },
          include: {
            team: {
              select: { id: true, name: true, shortName: true },
            },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return players.map((player) => ({
      ...player,
      teams: player.teamMemberships.map((tm) => tm.team),
      teamMemberships: undefined,
    }));
  }

  /**
   * Get single player by ID
   */
  async findById(id: string) {
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        teamMemberships: {
          where: { isActive: true },
          include: {
            team: {
              select: { id: true, name: true, shortName: true, primaryColor: true },
            },
          },
        },
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (!player) {
      throw new NotFoundError('Player');
    }

    return {
      ...player,
      teams: player.teamMemberships.map((tm) => tm.team),
      teamMemberships: undefined,
    };
  }

  /**
   * Create a new player
   */
  async create(data: CreatePlayerInput) {
    const player = await prisma.player.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        position: data.position,
        jerseyNumber: data.jerseyNumber,
        status: data.status,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        phone: data.phone,
        emergencyContact: data.emergencyContact,
      },
    });

    return player;
  }

  /**
   * Update a player
   */
  async update(id: string, data: UpdatePlayerInput) {
    // Check if player exists
    const existing = await prisma.player.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Player');
    }

    const player = await prisma.player.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
    });

    return player;
  }

  /**
   * Delete a player (soft delete by setting status to INACTIVE)
   */
  async delete(id: string) {
    const existing = await prisma.player.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Player');
    }

    await prisma.player.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  /**
   * Get player statistics across all games
   */
  async getStats(playerId: string, teamId?: string) {
    const where: Prisma.PlayerGameStatsWhereInput = { playerId };

    if (teamId) {
      where.game = { teamId };
    }

    const stats = await prisma.playerGameStats.findMany({
      where,
      include: {
        game: {
          select: {
            id: true,
            opponent: true,
            startTime: true,
            team: { select: { id: true, name: true, shortName: true } },
          },
        },
      },
      orderBy: { game: { startTime: 'desc' } },
    });

    // Calculate totals
    const totals = stats.reduce(
      (acc, s) => ({
        gamesPlayed: acc.gamesPlayed + 1,
        goals: acc.goals + s.goals,
        assists: acc.assists + s.assists,
        points: acc.points + s.goals + s.assists,
        plusMinus: acc.plusMinus + s.plusMinus,
        pim: acc.pim + s.pim,
        shots: acc.shots + s.shots,
      }),
      { gamesPlayed: 0, goals: 0, assists: 0, points: 0, plusMinus: 0, pim: 0, shots: 0 }
    );

    return { games: stats, totals };
  }
}

export const playerService = new PlayerService();
