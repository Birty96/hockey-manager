import { ApiError } from '../types';

const API_BASE = '/api';

interface FetchOptions extends RequestInit {
  body?: any;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { body, ...init } = options;
  
  const config: RequestInit = {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    credentials: 'include', // Include cookies for auth
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ 
      error: 'An unexpected error occurred' 
    }));
    throw new Error(error.error);
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json();
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{ user: any }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  
  signup: (email: string, password: string, confirmPassword: string) =>
    fetchApi<{ message: string; user: any }>('/auth/signup', {
      method: 'POST',
      body: { email, password, confirmPassword },
    }),

  logout: () =>
    fetchApi('/auth/logout', { method: 'POST' }),

  getMe: () =>
    fetchApi<any>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchApi('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),

  // Admin-only endpoints
  getPendingUsers: () =>
    fetchApi<any[]>('/auth/pending'),

  getAllUsers: () =>
    fetchApi<any[]>('/auth/users'),

  approveUser: (userId: string) =>
    fetchApi<{ message: string; user: any }>(`/auth/approve/${userId}`, {
      method: 'POST',
    }),

  rejectUser: (userId: string) =>
    fetchApi<{ message: string }>(`/auth/reject/${userId}`, {
      method: 'DELETE',
    }),

  // Admin creates user (auto-approved)
  createUser: (email: string, password: string, role: string) =>
    fetchApi<any>('/auth/register', {
      method: 'POST',
      body: { email, password, role },
    }),
};

// Players API
export const playersApi = {
  getAll: () =>
    fetchApi<any[]>('/players'),

  getById: (id: string) =>
    fetchApi<any>(`/players/${id}`),
  
  create: (data: any) =>
    fetchApi<any>('/players', { method: 'POST', body: data }),
  
  update: (id: string, data: any) =>
    fetchApi<any>(`/players/${id}`, { method: 'PATCH', body: data }),
  
  delete: (id: string) =>
    fetchApi(`/players/${id}`, { method: 'DELETE' }),
  
  getStats: (id: string, teamId?: string) => {
    const query = teamId ? `?teamId=${teamId}` : '';
    return fetchApi<any>(`/players/${id}/stats${query}`);
  },
};

// Teams API
export const teamsApi = {
  getAll: () =>
    fetchApi<any[]>('/teams'),
  
  getById: (id: string) =>
    fetchApi<any>(`/teams/${id}`),
  
  create: (data: any) =>
    fetchApi<any>('/teams', { method: 'POST', body: data }),
  
  update: (id: string, data: any) =>
    fetchApi<any>(`/teams/${id}`, { method: 'PATCH', body: data }),
  
  getPlayers: (id: string) =>
    fetchApi<any[]>(`/teams/${id}/players`),
  
  addPlayer: (teamId: string, playerId: string) =>
    fetchApi(`/teams/${teamId}/players`, { method: 'POST', body: { playerId } }),
  
  removePlayer: (teamId: string, playerId: string) =>
    fetchApi(`/teams/${teamId}/players/${playerId}`, { method: 'DELETE' }),
  
  getStats: (id: string) =>
    fetchApi<any>(`/teams/${id}/stats`),
  
  uploadLogo: async (teamId: string, file: File): Promise<{ logoUrl: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await fetch(`${API_BASE}/uploads/logo/${teamId}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error);
    }
    
    return response.json();
  },
  
  removeLogo: (teamId: string) =>
    fetchApi(`/uploads/logo/${teamId}`, { method: 'DELETE' }),
};

// Games API
export const gamesApi = {
  getAll: (params?: { teamId?: string; status?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<any[]>(`/games${query ? `?${query}` : ''}`);
  },
  
  getById: (id: string) =>
    fetchApi<any>(`/games/${id}`),
  
  create: (data: any) =>
    fetchApi<any>('/games', { method: 'POST', body: data }),
  
  update: (id: string, data: any) =>
    fetchApi<any>(`/games/${id}`, { method: 'PATCH', body: data }),
  
  delete: (id: string) =>
    fetchApi(`/games/${id}`, { method: 'DELETE' }),
  
  addToRoster: (gameId: string, playerId: string) =>
    fetchApi(`/games/${gameId}/roster`, { method: 'POST', body: { playerId } }),
  
  removeFromRoster: (gameId: string, playerId: string) =>
    fetchApi(`/games/${gameId}/roster/${playerId}`, { method: 'DELETE' }),
  
  lockRoster: (gameId: string) =>
    fetchApi(`/games/${gameId}/lock`, { method: 'POST' }),
  
  unlockRoster: (gameId: string) =>
    fetchApi(`/games/${gameId}/unlock`, { method: 'POST' }),
  
  getLineup: (gameId: string) =>
    fetchApi<any>(`/games/${gameId}/lineup`),
  
  setLineup: (gameId: string, lineup: any) =>
    fetchApi(`/games/${gameId}/lineup`, { method: 'PUT', body: lineup }),
  
  getAvailability: (gameId: string) =>
    fetchApi<any[]>(`/games/${gameId}/availability`),
  
  setAvailability: (gameId: string, data: { status: string; note?: string }) =>
    fetchApi(`/games/${gameId}/availability`, { method: 'PUT', body: data }),
  
  getStats: (gameId: string) =>
    fetchApi<any[]>(`/games/${gameId}/stats`),
  
  recordStats: (gameId: string, data: any) =>
    fetchApi<any>(`/games/${gameId}/stats`, { method: 'POST', body: data }),
};

// Stats API
export const statsApi = {
  update: (id: string, data: any) =>
    fetchApi<any>(`/stats/${id}`, { method: 'PATCH', body: data }),
  
  getLeaders: (stat: string = 'points', limit: number = 10) =>
    fetchApi<any[]>(`/stats/leaders?stat=${stat}&limit=${limit}`),
  
  getTeamStats: (teamId: string) =>
    fetchApi<any[]>(`/stats/team/${teamId}`),
};
