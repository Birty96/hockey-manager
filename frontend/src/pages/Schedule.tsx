import { useEffect, useState } from 'react';
import { gamesApi, teamsApi } from '../services/api';
import { Game, Team } from '../types';
import { Plus, Calendar, MapPin, Clock, X, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400',
  CANCELLED: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400',
  POSTPONED: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
};

interface GameFormData {
  teamId: string;
  opponentName: string;
  gameType: string;
  dateTime: string;
  location: string;
  isHome: boolean;
}

const emptyForm: GameFormData = {
  teamId: '',
  opponentName: '',
  gameType: 'REGULAR',
  dateTime: '',
  location: '',
  isHome: true,
};

export default function Schedule() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState<GameFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingGame(null);
    setFormData({
      ...emptyForm,
      teamId: teams[0]?.id || '',
    });
    setError(null);
    setShowModal(true);
  }

  function openEditModal(game: Game) {
    setEditingGame(game);
    setFormData({
      teamId: game.teamId,
      opponentName: game.opponentName,
      gameType: game.gameType,
      dateTime: game.dateTime ? new Date(game.dateTime).toISOString().slice(0, 16) : '',
      location: game.location || '',
      isHome: game.isHome,
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        dateTime: new Date(formData.dateTime).toISOString(),
        location: formData.location || null,
      };

      if (editingGame) {
        await gamesApi.update(editingGame.id, payload);
      } else {
        await gamesApi.create(payload);
      }
      
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save game');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(game: Game) {
    if (!window.confirm(`Are you sure you want to delete this game against ${game.opponentName}?`)) {
      return;
    }

    try {
      await gamesApi.delete(game.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete game');
    }
  }

  const filteredGames = games.filter((game) => {
    const matchesTeam = !filterTeam || game.teamId === filterTeam;
    const matchesStatus = !filterStatus || game.status === filterStatus;
    return matchesTeam && matchesStatus;
  });

  const sortedGames = [...filteredGames].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage games and events</p>
        </div>
        {canEdit && teams.length > 0 && (
          <button 
            onClick={openAddModal}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Game
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No teams yet</h3>
          <p className="text-gray-500 dark:text-gray-400">Create a team first before adding games</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="POSTPONED">Postponed</option>
              </select>
            </div>
          </div>

          {/* Games List */}
          <div className="space-y-4">
            {sortedGames.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                <Calendar className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No games scheduled</h3>
                <p className="text-gray-500 dark:text-gray-400">Add your first game to get started</p>
              </div>
            ) : (
              sortedGames.map((game) => {
                const team = teams.find(t => t.id === game.teamId);
                return (
                  <div key={game.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: team?.primaryColor || '#6b7280' }}
                        >
                          {team?.shortName?.substring(0, 2) || '??'}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {game.isHome ? `vs ${game.opponentName}` : `@ ${game.opponentName}`}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[game.status] || ''}`}>
                              {game.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{team?.name}</p>
                        </div>
                      </div>

                      <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className="text-sm">{formatDate(game.dateTime)}</span>
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="text-sm">{formatTime(game.dateTime)}</span>
                        </div>
                        {game.location && (
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span className="text-sm">{game.location}</span>
                          </div>
                        )}
                        {canEdit && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(game)}
                              className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(game)}
                              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {game.status === 'COMPLETED' && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-center gap-8">
                          <div className="text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{team?.shortName}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{game.homeScore ?? '-'}</p>
                          </div>
                          <div className="text-gray-400">-</div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{game.opponentName}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{game.awayScore ?? '-'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingGame ? 'Edit Game' : 'Add Game'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Team *
                </label>
                <select
                  required
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Opponent *
                </label>
                <input
                  type="text"
                  required
                  value={formData.opponentName}
                  onChange={(e) => setFormData({ ...formData, opponentName: e.target.value })}
                  placeholder="e.g. Mighty Ducks"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Game Type
                  </label>
                  <select
                    value={formData.gameType}
                    onChange={(e) => setFormData({ ...formData, gameType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="REGULAR">Regular Season</option>
                    <option value="PLAYOFF">Playoff</option>
                    <option value="TOURNAMENT">Tournament</option>
                    <option value="EXHIBITION">Exhibition</option>
                    <option value="PRACTICE">Practice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Home/Away
                  </label>
                  <select
                    value={formData.isHome ? 'home' : 'away'}
                    onChange={(e) => setFormData({ ...formData, isHome: e.target.value === 'home' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="home">Home</option>
                    <option value="away">Away</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.dateTime}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Main Arena"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingGame ? 'Update Game' : 'Add Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
