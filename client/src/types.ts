export type SuspectStatus = "unknown" | "prime" | "maybe" | "cleared";

export interface Case {
  id: number;
  slug: string;
  case_number: string | null;
  title: string;
  objective: string;
  briefing: string | null;
  verify_url: string | null;
  cover_path: string | null;
}

export interface Evidence {
  id: number;
  case_id: number;
  type: string;
  title: string;
  image_path: string;
  position: number;
  locked: number;
  suspect_id: number | null;
}

export interface Suspect {
  id: number;
  case_id: number;
  name: string;
  mugshot_path: string | null;
  details: string | null;
}

export interface Objective {
  id: number;
  case_id: number;
  prompt: string;
  position: number;
}

export interface Player {
  id: number;
  room_id: number;
  name: string;
  color: string;
  online: number;
}

export interface Note {
  id: number;
  room_id: number;
  player_id: number | null;
  evidence_id: number | null;
  suspect_id: number | null;
  text: string;
  created_at: string;
}

export interface Room {
  id: number;
  code: string;
  case_id: number;
  host_name: string | null;
  max_players: number;
  solved: number;
}

export interface TimelineEvent {
  id: number;
  case_id: number;
  time_label: string;
  title: string;
  description: string | null;
  position: number;
}

export interface Hint {
  id: number;
  case_id: number;
  text: string;
  position: number;
}

export interface Deduction {
  id: number;
  room_id: number;
  suspect_id: number;
  evidence_id: number;
  player_id: number | null;
  label: string | null;
}

export interface Vote {
  room_id: number;
  player_id: number;
  suspect_id: number;
}

export interface RoomState {
  room: Room;
  case: Case;
  evidence: Evidence[];
  suspects: Suspect[];
  objectives: Objective[];
  timeline: TimelineEvent[];
  hints: Hint[];
  players: Player[];
  notes: Note[];
  board: { suspect_id: number; status: SuspectStatus }[];
  deductions: Deduction[];
  votes: Vote[];
  searches: { suspect_id: number; player_id: number | null }[];
  searchBudget: number;
  unlockedHints: number;
  secondsToNextHint: number | null;
  accusationLockUntil: string | null;
  you: Player;
}
