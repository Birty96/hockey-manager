import { useEffect, useState } from 'react';
import { playersApi } from '../services/api';
import { Player, Position } from '../types';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const positionLabels: Record<Position, string> = {
  CENTER: 'C',
  LEFT_WING: 'LW',
  RIGHT_WING: 'RW',
  DEFENSE: 'D',
  GOALIE: 'G',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400',
  INJURED: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400',
  UNAVAILABLE: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400',
  INACTIVE: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
};

interface PlayerFormData {
  firstName: string;
  lastName: string;
  jerseyNumber: string;
  position: string;
  status: string;
  dateOfBirth: string;
  phone: string;
  emergencyContact: string;
}

const emptyForm: PlayerFormData = {
  firstName: '',
  lastName: '',
  jerseyNumber: '',
  position: 'CENTER',
  status: 'ACTIVE',
  dateOfBirth: '',
  phone: '',
  emergencyContact: '',
};

export default function Players() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState<PlayerFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = user?.role === 'ADMIN';

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    try {
      const data = await playersApi.getAll();
      setPlayers(data);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingPlayer(null);
    setFormData(emptyForm);
    setError(null);
    setShowModal(true);
  }

  function openEditModal(player: Player) {
    setEditingPlayer(player);
    setFormData({
      firstName: player.firstName,
      lastName: player.lastName,
      jerseyNumber: player.jerseyNumber?.toString() || '',
      position: player.position,
      status: player.status,
      dateOfBirth: player.dateOfBirth ? player.dateOfBirth.split('T')[0] : '',
      phone: player.phone || '',
      emergencyContact: player.emergencyContact || '',
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
        jerseyNumber: formData.jerseyNumber ? parseInt(formData.jerseyNumber) : null,
        dateOfBirth: formData.dateOfBirth || null,
        phone: formData.phone || null,
        emergencyContact: formData.emergencyContact || null,
      };

      if (editingPlayer) {
        await playersApi.update(editingPlayer.id, payload);
      } else {
        await playersApi.create(payload);
      }
      
      setShowModal(false);
      await loadPlayers();
    } catch (err: any) {
      setError(err.message || 'Failed to save player');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(player: Player) {
    if (!window.confirm(`Are you sure you want to delete ${player.firstName} ${player.lastName}?`)) {
      return;
    }

    try {
      await playersApi.delete(player.id);
      await loadPlayers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete player');
    }
  }

  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      `${player.firstName} ${player.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      player.jerseyNumber?.toString().includes(searchTerm);

    const matchesPosition = !filterPosition || player.position === filterPosition;
    const matchesStatus = !filterStatus || player.status === filterStatus;

    return matchesSearch && matchesPosition && matchesStatus;
  });

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Players</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your player roster</p>
        </div>
        {canEdit && (
          <button 
            onClick={openAddModal}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Player
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Positions</option>
            <option value="CENTER">Center</option>
            <option value="LEFT_WING">Left Wing</option>
            <option value="RIGHT_WING">Right Wing</option>
            <option value="DEFENSE">Defense</option>
            <option value="GOALIE">Goalie</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INJURED">Injured</option>
            <option value="UNAVAILABLE">Unavailable</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Player</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Teams</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                {canEdit && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPlayers.map((player) => (
                <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                      {player.jerseyNumber ?? '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {player.firstName} {player.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 font-medium text-sm">
                      {positionLabels[player.position]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-1">
                      {player.teams?.map((team) => (
                        <span
                          key={team.id}
                          className="px-2 py-1 text-xs font-medium rounded"
                          style={{
                            backgroundColor: `${team.primaryColor}20`,
                            color: team.primaryColor,
                          }}
                        >
                          {team.shortName}
                        </span>
                      ))}
                      {(!player.teams || player.teams.length === 0) && (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">No team</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[player.status] || ''}`}>
                      {player.status.toLowerCase()}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => openEditModal(player)}
                        className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mr-3"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(player)}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No players found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingPlayer ? 'Edit Player' : 'Add Player'}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={formData.jerseyNumber}
                    onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Position *
                  </label>
                  <select
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="CENTER">Center</option>
                    <option value="LEFT_WING">Left Wing</option>
                    <option value="RIGHT_WING">Right Wing</option>
                    <option value="DEFENSE">Defense</option>
                    <option value="GOALIE">Goalie</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INJURED">Injured</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  placeholder="Name - Phone"
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
                  {saving ? 'Saving...' : editingPlayer ? 'Update Player' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
