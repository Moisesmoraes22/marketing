export interface Search {
  id: string;
  name: string;
  hashtags: string[];
  accounts: string[];
  min_engagement: number;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export type ContentStatus =
  | "collected"
  | "transcribing"
  | "analyzing"
  | "done"
  | "error";

export type MediaType = "post" | "carousel" | "reel";

export interface ContentItem {
  id: string;
  search_id: string | null;
  source_url: string;
  caption: string | null;
  media_type: MediaType;
  engagement_score: number;
  thumbnail_url: string | null;
  collected_at: string;
  status: ContentStatus;
}

export type AnalysisType = "transcription" | "analysis" | "critique";

export interface TranscriptionContent {
  text: string;
}

export interface AnalysisContent {
  hook: string;
  narrative_structure: { intro: string; body: string; cta: string };
  tone: string[];
  engagement_triggers: string[];
  why_it_works: string;
}

export interface CritiqueContent {
  relevance_score: number;
  adaptation_potential: "alta" | "media" | "baixa";
  risks: string[];
  recommendation: "adaptar" | "inspirar" | "ignorar";
  justification: string;
}

export interface AnalysisRow {
  id: string;
  content_item_id: string;
  type: AnalysisType;
  content: TranscriptionContent | AnalysisContent | CritiqueContent;
  created_at: string;
}
