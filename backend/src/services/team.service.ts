import { prisma } from '../lib/prisma';
import { CreateTeamInput, UpdateTeamInput, AddPlayerToTeamInput } from '../schemas/team.schema';
import { NotFoundError, ConflictError } from '../middleware/error';

export class TeamService {
  /**
   * Get all teams
   */
  async findAll() {
    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: {
            players: { where: { isActive: true } },
            games: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return teams.map((team) => ({
      ...team,
      playerCount: team._count.players,
      gameCount: team._count.games,
      _count: undefined,
    }));
  }

  /**
   * Get single team by ID
   */
  async findById(id: string) {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        coaches: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
        players: {
          where: { isActive: true },
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
      },
    });

    if (!team) {
      throw new NotFoundError('Team');
    }

    return {
      ...team,
      players: team.players.map((tp) => tp.player),
      coaches: team.coaches.map((tc) => ({
        ...tc.user,
        isHeadCoach: tc.isHeadCoach,
      })),
    };
  }

  /**
   * Create a new team
   */
  async create(data: CreateTeamInput) {
    const team = await prisma.team.create({
      data,
    });

    return team;
  }

  /**
   * Update a team
   */
  async update(id: string, data: UpdateTeamInput) {
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Team');
    }

    const team = await prisma.team.update({
      where: { id },
      data,
    });

    return team;
  }

  /**
   * Add player to team
   */
  async addPlayer(teamId: string, data: AddPlayerToTeamInput) {
    // Verify team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundError('Team');
    }

    // Verify player exists
    const player = await prisma.player.findUnique({ where: { id: data.playerId } });
    if (!player) {
      throw new NotFoundError('Player');
    }

    // Check if already on team
    const existing = await prisma.teamPlayer.findUnique({
      where: {
        playerId_teamId: { playerId: data.playerId, teamId },
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictError('Player is already on this team');
      }
      // Reactivate if previously removed
      await prisma.teamPlayer.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      return;
    }

    // Add to team
    await prisma.teamPlayer.create({
      data: {
        playerId: data.playerId,
        teamId,
      },
    });
  }

  /**
   * Remove player from team
   */
  async removePlayer(teamId: string, playerId: string) {
    const membership = await prisma.teamPlayer.findUnique({
      where: {
        playerId_teamId: { playerId, teamId },
      },
    });

    if (!membership) {
      throw new NotFoundError('Team membership');
    }

    // Soft delete
    await prisma.teamPlayer.update({
      where: { id: membership.id },
      data: { isActive: false },
    });
  }

  /**
   * Get team players
   */
  async getPlayers(teamId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundError('Team');
    }

    const memberships = await prisma.teamPlayer.findMany({
      where: { teamId, isActive: true },
      include: {
        player: true,
      },
      orderBy: { player: { lastName: 'asc' } },
    });

    return memberships.map((m) => m.player);
  }

  /**
   * Get team statistics
   */
  async getStats(teamId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundError('Team');
    }

    // Get completed games
    const games = await prisma.game.findMany({
      where: { teamId, status: 'COMPLETED' },
      include: {
        stats: true,
      },
    });

    // Aggregate stats
    const totals = {
      gamesPlayed: games.length,
      goalsFor: 0,
      goalsAgainst: 0,
      totalPIM: 0,
    };

    games.forEach((game) => {
      game.stats.forEach((stat) => {
        totals.goalsFor += stat.goals;
        totals.totalPIM += stat.pim;
        if (stat.goalsAgainst !== null) {
          totals.goalsAgainst += stat.goalsAgainst;
        }
      });
    });

    return totals;
  }
}

export const teamService = new TeamService();
