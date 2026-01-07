import { useEffect, useState } from 'react';
import { statsApi, teamsApi } from '../services/api';
import { Team, PlayerSeasonStats } from '../types';
import { Trophy, Target, Crosshair } from 'lucide-react';

export default function Stats() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [teamStats, setTeamStats] = useState<PlayerSeasonStats[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamStats(selectedTeam);
    }
  }, [selectedTeam]);

  async function loadInitialData() {
    try {
      const [teamsData, leadersData] = await Promise.all([
        teamsApi.getAll(),
        statsApi.getLeaders('points', 10),
      ]);
      setTeams(teamsData);
      setLeaders(leadersData);
      if (teamsData.length > 0) {
        setSelectedTeam(teamsData[0].id);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamStats(teamId: string) {
    try {
      const data = await statsApi.getTeamStats(teamId);
      setTeamStats(data);
    } catch (error) {
      console.error('Failed to load team stats:', error);
      setTeamStats([]);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Player and team statistics</p>
      </div>

      {/* League Leaders */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-8">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">League Leaders</h2>
          </div>
        </div>
        <div className="p-6">
          {leaders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top Scorer */}
              {leaders[0] && (
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Target className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Points Leader</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {leaders[0].player?.firstName} {leaders[0].player?.lastName}
                  </p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                    {leaders[0].points} pts
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {leaders[0].goals}G - {leaders[0].assists}A
                  </p>
                </div>
              )}

              {/* Goals Leader */}
              {leaders.sort((a, b) => b.goals - a.goals)[0] && (
                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Crosshair className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-300">Goals Leader</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {leaders[0].player?.firstName} {leaders[0].player?.lastName}
                  </p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {leaders[0].goals} goals
                  </p>
                </div>
              )}

              {/* Assists Leader */}
              {leaders.sort((a, b) => b.assists - a.assists)[0] && (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <span className="text-blue-600 dark:text-blue-400 mr-2 font-bold">A</span>
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Assists Leader</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {leaders[0].player?.firstName} {leaders[0].player?.lastName}
                  </p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {leaders[0].assists} assists
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">No stats recorded yet</p>
          )}
        </div>
      </div>

      {/* Team Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Statistics</h2>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  GP
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  G
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  A
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  PTS
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  +/-
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  PIM
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {teamStats.map((stat, index) => (
                <tr key={stat.player.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 mr-3">
                        {stat.player.jerseyNumber ?? '?'}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {stat.player.firstName} {stat.player.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {stat.player.position.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-gray-100">
                    {stat.gamesPlayed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-gray-100">
                    {stat.goals}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-gray-100">
                    {stat.assists}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900 dark:text-white">
                    {stat.points}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span className={stat.plusMinus >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {stat.plusMinus > 0 ? '+' : ''}{stat.plusMinus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-gray-100">
                    {stat.pim}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {teamStats.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No statistics recorded for this team yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
