import { prisma } from '../lib/prisma';
import { CreateStatsInput, UpdateStatsInput } from '../schemas/stats.schema';
import { NotFoundError } from '../middleware/error';

export class StatsService {
  /**
   * Record stats for a player in a game
   */
  async createGameStats(gameId: string, data: CreateStatsInput) {
    // Verify game exists
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundError('Game');
    }

    // Verify player is on roster
    const roster = await prisma.gameRoster.findUnique({
      where: {
        gameId_playerId: { gameId, playerId: data.playerId },
      },
    });

    if (!roster) {
      throw new NotFoundError('Player not on game roster');
    }

    const stats = await prisma.playerGameStats.upsert({
      where: {
        playerId_gameId: { playerId: data.playerId, gameId },
      },
      update: {
        goals: data.goals,
        assists: data.assists,
        plusMinus: data.plusMinus,
        pim: data.pim,
        shots: data.shots,
        saves: data.saves,
        goalsAgainst: data.goalsAgainst,
        shotsAgainst: data.shotsAgainst,
      },
      create: {
        gameId,
        playerId: data.playerId,
        goals: data.goals,
        assists: data.assists,
        plusMinus: data.plusMinus,
        pim: data.pim,
        shots: data.shots,
        saves: data.saves,
        goalsAgainst: data.goalsAgainst,
        shotsAgainst: data.shotsAgainst,
      },
    });

    return stats;
  }

  /**
   * Update stats entry
   */
  async updateStats(id: string, data: UpdateStatsInput) {
    const existing = await prisma.playerGameStats.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Stats entry');
    }

    const stats = await prisma.playerGameStats.update({
      where: { id },
      data,
    });

    return stats;
  }

  /**
   * Get all stats for a game
   */
  async getGameStats(gameId: string) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundError('Game');
    }

    const stats = await prisma.playerGameStats.findMany({
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
      orderBy: [
        { goals: 'desc' },
        { assists: 'desc' },
      ],
    });

    return stats;
  }

  /**
   * Get team season stats
   */
  async getTeamSeasonStats(teamId: string) {
    // Get all players on team
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: { teamId, isActive: true },
      include: {
        player: {
          include: {
            stats: {
              where: { game: { teamId } },
            },
          },
        },
      },
    });

    const playerStats = teamPlayers.map((tp) => {
      const totals = tp.player.stats.reduce(
        (acc, s) => ({
          gamesPlayed: acc.gamesPlayed + 1,
          goals: acc.goals + s.goals,
          assists: acc.assists + s.assists,
          plusMinus: acc.plusMinus + s.plusMinus,
          pim: acc.pim + s.pim,
          shots: acc.shots + s.shots,
        }),
        { gamesPlayed: 0, goals: 0, assists: 0, plusMinus: 0, pim: 0, shots: 0 }
      );

      return {
        player: {
          id: tp.player.id,
          firstName: tp.player.firstName,
          lastName: tp.player.lastName,
          position: tp.player.position,
          jerseyNumber: tp.player.jerseyNumber,
        },
        ...totals,
        points: totals.goals + totals.assists,
      };
    });

    // Sort by points
    playerStats.sort((a, b) => b.points - a.points);

    return playerStats;
  }

  /**
   * Get league leaders
   */
  async getLeaders(stat: 'goals' | 'assists' | 'points' | 'pim', limit: number = 10) {
    const allStats = await prisma.playerGameStats.groupBy({
      by: ['playerId'],
      _sum: {
        goals: true,
        assists: true,
        pim: true,
      },
    });

    const players = await prisma.player.findMany({
      where: { id: { in: allStats.map((s) => s.playerId) } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        jerseyNumber: true,
      },
    });

    const playerMap = new Map(players.map((p) => [p.id, p]));

    const leaders = allStats
      .map((s) => ({
        player: playerMap.get(s.playerId)!,
        goals: s._sum.goals || 0,
        assists: s._sum.assists || 0,
        points: (s._sum.goals || 0) + (s._sum.assists || 0),
        pim: s._sum.pim || 0,
      }))
      .sort((a, b) => b[stat] - a[stat])
      .slice(0, limit);

    return leaders;
  }
}

export const statsService = new StatsService();
