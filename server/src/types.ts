export type EvidenceType =
  | "intro"
  | "witness"
  | "suspect"
  | "letter"
  | "call"
  | "photo"
  | "article"
  | "other";

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
  type: EvidenceType;
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

export interface Player {
  id: number;
  room_id: number;
  client_id: string | null;
  name: string;
  color: string;
  online: number;
  joined_at: string;
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
  search_budget: number;
  solved: number;
  created_at: string;
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
  created_at: string;
}

export interface Vote {
  room_id: number;
  player_id: number;
  suspect_id: number;
}
