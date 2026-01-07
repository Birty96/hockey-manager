import { useEffect, useState, useRef } from 'react';
import { teamsApi } from '../services/api';
import { Team } from '../types';
import { Plus, Users, Calendar, Upload, X, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

export default function Teams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedTeam) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a valid image file (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const result = await teamsApi.uploadLogo(selectedTeam.id, file);
      // Update the selected team with the new logo URL
      const updatedTeam = { ...selectedTeam, logoUrl: result.logoUrl };
      setSelectedTeam(updatedTeam);
      // Update teams list
      setTeams(teams.map(t => t.id === selectedTeam.id ? updatedTeam : t));
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleRemoveLogo() {
    if (!selectedTeam?.logoUrl) return;
    
    if (!window.confirm('Are you sure you want to remove the team logo?')) return;

    try {
      await teamsApi.removeLogo(selectedTeam.id);
      const updatedTeam = { ...selectedTeam, logoUrl: null };
      setSelectedTeam(updatedTeam);
      setTeams(teams.map(t => t.id === selectedTeam.id ? updatedTeam : t));
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
          <button className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            <Plus className="h-5 w-5 mr-2" />
            Add Team
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">All Teams</h2>
            </div>
            <div className="p-4 space-y-3">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => selectTeam(team)}
                  className={`w-full p-4 rounded-lg text-left transition-colors ${
                    selectedTeam?.id === team.id
                      ? 'bg-primary-50 dark:bg-primary-900/30 border-2 border-primary-500'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center">
                    {team.logoUrl ? (
                      <img
                        src={`${API_BASE}${team.logoUrl}`}
                        alt={`${team.name} logo`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: team.primaryColor || '#3b82f6' }}
                      >
                        {team.shortName}
                      </div>
                    )}
                    <div className="ml-3">
                      <h3 className="font-medium text-gray-900 dark:text-white">{team.name}</h3>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <Users className="h-4 w-4 mr-1" />
                        {team.playerCount || 0}
                        <Calendar className="h-4 w-4 ml-3 mr-1" />
                        {team.gameCount || 0}
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {teams.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No teams yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Team Details */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div
                className="p-6 rounded-t-xl"
                style={{
                  background: `linear-gradient(135deg, ${selectedTeam.primaryColor || '#3b82f6'}, ${selectedTeam.secondaryColor || '#1e40af'})`,
                }}
              >
                <div className="flex items-center">
                  {/* Team Logo with Upload Option */}
                  <div className="relative group">
                    {selectedTeam.logoUrl ? (
                      <img
                        src={`${API_BASE}${selectedTeam.logoUrl}`}
                        alt={`${selectedTeam.name} logo`}
                        className="w-16 h-16 rounded-full object-cover bg-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-2xl font-bold"
                        style={{ color: selectedTeam.primaryColor || '#3b82f6' }}
                      >
                        {selectedTeam.shortName}
                      </div>
                    )}
                    
                    {/* Upload overlay - visible on hover for admins/coaches */}
                    {(user?.role === 'ADMIN' || user?.role === 'COACH') && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Camera className="h-6 w-6 text-white" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 text-white flex-1">
                    <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
                    <p className="opacity-80">
                      {teamPlayers.length} players on roster
                    </p>
                  </div>
                  
                  {/* Logo Actions */}
                  {(user?.role === 'ADMIN' || user?.role === 'COACH') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-white text-sm transition-colors disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        {selectedTeam.logoUrl ? 'Change Logo' : 'Upload Logo'}
                      </button>
                      {selectedTeam.logoUrl && (
                        <button
                          onClick={handleRemoveLogo}
                          className="flex items-center gap-2 px-3 py-2 bg-red-500 bg-opacity-80 hover:bg-opacity-100 rounded-lg text-white text-sm transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                
                {/* Upload error message */}
                {uploadError && (
                  <div className="mt-3 p-2 bg-red-500 bg-opacity-20 rounded-lg text-white text-sm">
                    {uploadError}
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Team Roster</h3>
                  {(user?.role === 'ADMIN' || user?.role === 'COACH') && (
                    <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700">
                      + Add Player
                    </button>
                  )}
                </div>

                {teamPlayers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {teamPlayers.map((player: any) => (
                      <div
                        key={player.id}
                        className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                          {player.jerseyNumber ?? '?'}
                        </span>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {player.position.replace('_', ' ')}
                          </p>
                        </div>
                        <span
                          className={`ml-auto px-2 py-1 text-xs rounded-full ${
                            player.status === 'ACTIVE'
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                              : player.status === 'INJURED'
                                ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                                : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {player.status.toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No players on this team yet
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">Select a team to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
