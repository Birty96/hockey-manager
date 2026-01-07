// User types
export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'COACH' | 'PLAYER';
  playerId?: string | null;
  player?: {
    id: string;
    firstName: string;
    lastName: string;
    position: Position;
  } | null;
  coachedTeams?: {
    team: Team;
    isHeadCoach: boolean;
  }[];
}

// Player types
export type Position = 'CENTER' | 'LEFT_WING' | 'RIGHT_WING' | 'DEFENSE' | 'GOALIE';
export type PlayerStatus = 'ACTIVE' | 'INJURED' | 'UNAVAILABLE' | 'INACTIVE';

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: number;
  position: Position;
  status: PlayerStatus;
  dateOfBirth?: string;
  phone?: string;
  emergencyContact?: string;
  teams?: Team[];
  createdAt: string;
  updatedAt: string;
}

// League types
export interface League {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  teams?: Team[];
}

// Team types
export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  leagueId?: string | null;
  league?: League | null;
  playerCount?: number;
  gameCount?: number;
}

// Game types
export type GameType = 'REGULAR' | 'PLAYOFF' | 'PRACTICE' | 'SCRIMMAGE';
export type GameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export interface Game {
  id: string;
  teamId: string;
  team?: Team;
  opponent: string;
  location: string;
  gameType: GameType;
  startTime: string;
  endTime: string;
  isHome: boolean;
  status: GameStatus;
  rosterLocked: boolean;
  rosterCount?: number;
  roster?: Player[];
  lineup?: Lineup;
  availabilities?: PlayerAvailability[];
}

// Availability types
export type AvailabilityStatus = 'PENDING' | 'AVAILABLE' | 'UNAVAILABLE' | 'MAYBE';

export interface PlayerAvailability {
  id: string;
  playerId: string;
  gameId: string;
  status: AvailabilityStatus;
  note?: string;
  respondedAt?: string;
  player?: Player;
}

// Lineup types
export interface Lineup {
  forwardLines?: string[][];
  defensePairs?: string[][];
  goalies?: string[];
}

// Stats types
export interface PlayerGameStats {
  id: string;
  playerId: string;
  gameId: string;
  goals: number;
  assists: number;
  plusMinus: number;
  pim: number;
  shots: number;
  saves?: number;
  goalsAgainst?: number;
  shotsAgainst?: number;
  player?: Player;
  game?: Game;
}

export interface PlayerSeasonStats {
  player: Player;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim: number;
  shots: number;
}

// API response types
export interface ApiError {
  error: string;
  details?: { field: string; message: string }[];
}
