import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamsApi, gamesApi, playersApi } from '../services/api';
import { Team, Game } from '../types';
import { Calendar, Users, Shield, Clock } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [teamsData, gamesData] = await Promise.all([
          teamsApi.getAll(),
          gamesApi.getAll({ status: 'SCHEDULED' }),
        ]);
        setTeams(teamsData);
        setUpcomingGames(gamesData.slice(0, 5));
        
        // Get player count if admin/coach
        if (user?.role === 'ADMIN' || user?.role === 'COACH') {
          const players = await playersApi.getAll();
          setPlayerCount(players.length);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.player?.firstName || user?.email.split('@')[0]}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Here's what's happening with your teams.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Teams</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teams.length}</p>
            </div>
          </div>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'COACH') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Players</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{playerCount}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Upcoming Games</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{upcomingGames.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Your Role</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white capitalize">{user?.role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Teams */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Teams</h2>
          </div>
          <div className="p-6">
            {teams.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No teams yet</p>
            ) : (
              <div className="space-y-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: team.primaryColor || '#3b82f6' }}
                    >
                      {team.shortName}
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{team.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {team.playerCount || 0} players • {team.gameCount || 0} games
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Games */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Games</h2>
          </div>
          <div className="p-6">
            {upcomingGames.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No upcoming games</p>
            ) : (
              <div className="space-y-4">
                {upcomingGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: game.team?.primaryColor || '#3b82f6' }}
                        />
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {game.team?.shortName || 'TBD'} vs {game.opponent}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(game.startTime)} • {game.location}
                      </p>
                    </div>
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded-full ${
                        game.isHome ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}>
                        {game.isHome ? 'Home' : 'Away'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
