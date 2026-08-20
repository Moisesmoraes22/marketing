export interface Search {
  id: string;
  name: string;
  hashtags: string[];
  accounts: string[];
  min_engagement: number;
  results_limit: number;
  active: boolean;
  auto_run_interval_hours: number | null;
  last_run_at: string | null;
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
  likes_count: number;
  comments_count: number;
  thumbnail_url: string | null;
  video_url: string | null;
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

export interface VoiceProfile {
  id: string;
  target_audience: string | null;
  tone_adjectives: string[];
  words_we_use: string[];
  words_we_avoid: string[];
  example_approved_post: string | null;
  calibration_notes: string | null;
  updated_at: string;
}

export type ScriptFormat =
  | "reel_30s"
  | "reel_60s"
  | "reel_90s"
  | "carousel"
  | "static_post";

export interface CarouselSlide {
  slide_number: number;
  headline: string;
  body: string;
  visual_suggestion: string;
}

export interface CarouselScriptContent {
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
}

export interface ReelScriptContent {
  hook: string;
  body_segments: string[];
  cta: string;
  caption: string;
  hashtags: string[];
}

export interface StaticPostScriptContent {
  headline: string;
  body: string;
  cta: string;
  caption: string;
  hashtags: string[];
}

export type ScriptContent =
  | CarouselScriptContent
  | ReelScriptContent
  | StaticPostScriptContent;

export interface ScriptRow {
  id: string;
  content_item_id: string;
  format: ScriptFormat;
  content: ScriptContent;
  voice_profile_snapshot: VoiceProfile | null;
  approved: boolean;
  flagged_words: string[];
  created_at: string;
}

export const SCRIPT_FORMAT_LABEL: Record<ScriptFormat, string> = {
  reel_30s: "Reel 30s",
  reel_60s: "Reel 60s",
  reel_90s: "Reel 90s",
  carousel: "Carrossel",
  static_post: "Post estático",
};
