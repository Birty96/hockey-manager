import { useEffect, useState, useRef } from 'react';
import { teamsApi } from '../services/api';
import { Team } from '../types';
import { Plus, Users, Calendar, Upload, X, Camera, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

interface TeamFormData {
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
}

const emptyForm: TeamFormData = {
  name: '',
  shortName: '',
  primaryColor: '#1e40af',
  secondaryColor: '#ffffff',
};

export default function Teams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState<TeamFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = user?.role === 'ADMIN';

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    try {
      const data = await teamsApi.getAll();
      setTeams(data);
      if (data.length > 0) {
        selectTeam(data[0]);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  }

  async function selectTeam(team: Team) {
    setSelectedTeam(team);
    setUploadError(null);
    try {
      const players = await teamsApi.getPlayers(team.id);
      setTeamPlayers(players);
    } catch (error) {
      console.error('Failed to load team players:', error);
      setTeamPlayers([]);
    }
  }

  function openAddModal() {
    setEditingTeam(null);
    setFormData(emptyForm);
    setError(null);
    setShowModal(true);
  }

  function openEditModal(team: Team) {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      shortName: team.shortName,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingTeam) {
        await teamsApi.update(editingTeam.id, formData);
      } else {
        await teamsApi.create(formData);
      }
      
      setShowModal(false);
      await loadTeams();
    } catch (err: any) {
      setError(err.message || 'Failed to save team');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedTeam) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a valid image file (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const result = await teamsApi.uploadLogo(selectedTeam.id, file);
      const updatedTeam = { ...selectedTeam, logoUrl: result.logoUrl };
      setSelectedTeam(updatedTeam);
      setTeams(teams.map(t => t.id === selectedTeam.id ? updatedTeam : t));
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleRemoveLogo() {
    if (!selectedTeam || !selectedTeam.logoUrl) return;
    
    if (!window.confirm('Are you sure you want to remove the team logo?')) return;

    try {
      await teamsApi.removeLogo(selectedTeam.id);
      const updatedTeam = { ...selectedTeam, logoUrl: null };
      setSelectedTeam(updatedTeam as Team);
      setTeams(teams.map(t => t.id === selectedTeam.id ? updatedTeam as Team : t));
    } catch (error: any) {
      setUploadError(error.message || 'Failed to remove logo');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teams</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your teams and rosters</p>
        </div>
        {canEdit && (
          <button 
            onClick={openAddModal}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Team
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No teams yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first team</p>
          {canEdit && (
            <button 
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Team
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team List */}
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => selectTeam(team)}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 cursor-pointer transition-all ${
                  selectedTeam?.id === team.id
                    ? 'ring-2 ring-primary-500'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-center">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: team.primaryColor }}
                  >
                    {team.logoUrl ? (
                      <img
                        src={`${API_BASE}${team.logoUrl}`}
                        alt={team.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      team.shortName.substring(0, 2)
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{team.shortName}</p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(team);
                      }}
                      className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Team Details */}
          {selectedTeam && (
            <div className="lg:col-span-2 space-y-6">
              {/* Team Info Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-20 h-20 rounded-xl flex items-center justify-center text-white font-bold text-2xl relative group"
                      style={{ backgroundColor: selectedTeam.primaryColor }}
                    >
                      {selectedTeam.logoUrl ? (
                        <img
                          src={`${API_BASE}${selectedTeam.logoUrl}`}
                          alt={selectedTeam.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        selectedTeam.shortName.substring(0, 2)
                      )}
                      {canEdit && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-white"
                          >
                            <Camera className="h-6 w-6" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTeam.name}</h2>
                      <p className="text-gray-500 dark:text-gray-400">{selectedTeam.shortName}</p>
                      <div className="flex items-center mt-2 gap-2">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600"
                          style={{ backgroundColor: selectedTeam.primaryColor }}
                          title="Primary Color"
                        />
                        <div
                          className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600"
                          style={{ backgroundColor: selectedTeam.secondaryColor }}
                          title="Secondary Color"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    {uploadError && (
                      <div className="mt-4 text-sm text-red-600 dark:text-red-400">{uploadError}</div>
                    )}
                    {uploading && (
                      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">Uploading...</div>
                    )}
                    {selectedTeam.logoUrl && (
                      <button
                        onClick={handleRemoveLogo}
                        className="mt-4 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove Logo
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Team Roster */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Roster ({teamPlayers.length} players)
                  </h3>
                </div>
                <div className="p-6">
                  {teamPlayers.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">No players on this team yet</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {teamPlayers.map((player) => (
                        <div key={player.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold">
                            {player.jerseyNumber || '-'}
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-900 dark:text-white">{player.firstName} {player.lastName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{player.position}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingTeam ? 'Edit Team' : 'Add Team'}
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
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mighty Ducks"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Short Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                  placeholder="e.g. DUCKS"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
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
                  {saving ? 'Saving...' : editingTeam ? 'Update Team' : 'Add Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
