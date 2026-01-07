import { useEffect, useState } from 'react';
import { gamesApi, teamsApi } from '../services/api';
import { Game, Team } from '../types';
import { Plus, MapPin, Clock, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  POSTPONED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
};

export default function Schedule() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('');

  const canEdit = user?.role === 'ADMIN' || user?.role === 'COACH';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [gamesData, teamsData] = await Promise.all([
        gamesApi.getAll(),
        teamsApi.getAll(),
      ]);
      setGames(gamesData);
      setTeams(teamsData);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredGames = filterTeam
    ? games.filter((game) => game.teamId === filterTeam)
    : games;

  const upcomingGames = filteredGames
    .filter((g) => g.status === 'SCHEDULED' || g.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const pastGames = filteredGames
    .filter((g) => g.status === 'COMPLETED' || g.status === 'CANCELLED' || g.status === 'POSTPONED')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const GameCard = ({ game }: { game: Game }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: game.team?.primaryColor || '#3b82f6' }}
          >
            {game.team?.shortName || '??'}
          </div>
          <div className="ml-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {game.team?.shortName || 'TBD'} vs {game.opponent}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{game.gameType.toLowerCase()}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[game.status]}`}>
          {game.status.toLowerCase().replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
          {formatDate(game.startTime)} at {formatTime(game.startTime)}
        </div>
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
          {game.location}
          <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
            game.isHome ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {game.isHome ? 'Home' : 'Away'}
          </span>
        </div>
        <div className="flex items-center">
          <Users className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
          {game.rosterCount || 0} players rostered
          {game.rosterLocked && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
              Locked
            </span>
          )}
        </div>
      </div>

      {canEdit && game.status === 'SCHEDULED' && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
          <button className="flex-1 px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
            Edit
          </button>
          <button className="flex-1 px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
            Roster
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage game schedule</p>
        </div>
        {canEdit && (
          <button className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            <Plus className="h-5 w-5 mr-2" />
            Add Game
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        >
          <option value="">All Teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Upcoming Games */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upcoming Games ({upcomingGames.length})
        </h2>
        {upcomingGames.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
            No upcoming games scheduled
          </div>
        )}
      </div>

      {/* Past Games */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Past Games ({pastGames.length})
        </h2>
        {pastGames.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
            No past games
          </div>
        )}
      </div>
    </div>
  );
}
