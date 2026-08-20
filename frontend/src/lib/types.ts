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
  opportunity_level: OpportunityLevel | null;
  opportunity_rank: number | null;
  risk_level: RiskLevel | null;
  recommendation: Recommendation | null;
  owner_username: string | null;
  is_favorite: boolean;
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

export type Recommendation = "adaptar" | "inspirar" | "ignorar";
export type RiskLevel = "baixo" | "medio" | "alto";
export type OpportunityLevel = "alta" | "moderada" | "baixa";
export type Level5 = "muito_baixa" | "baixa" | "media" | "alta" | "muito_alta";
export type Level5Masc = "muito_baixo" | "baixo" | "medio" | "alto" | "muito_alto";

export interface CritiqueContent {
  opportunity_level: OpportunityLevel;
  viralidade: Level5;
  relevancia: Level5;
  potencial_comercial: Level5Masc;
  adaptabilidade: Level5;
  risk_level: RiskLevel;
  risks: string[];
  recommendation: Recommendation;
  justification: string;
}

export const RECOMMENDATION_META: Record<
  Recommendation,
  { label: string; emoji: string; className: string }
> = {
  adaptar: {
    label: "Adaptar",
    emoji: "🟢",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  inspirar: {
    label: "Inspirar",
    emoji: "🟡",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  },
  ignorar: {
    label: "Ignorar",
    emoji: "🔴",
    className: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  },
};

export const OPPORTUNITY_META: Record<
  OpportunityLevel,
  { label: string; emoji: string; className: string }
> = {
  alta: {
    label: "Alta oportunidade",
    emoji: "🟢",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  moderada: {
    label: "Oportunidade moderada",
    emoji: "🟡",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  },
  baixa: {
    label: "Baixa oportunidade",
    emoji: "🔴",
    className: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  },
};

export const RISK_META: Record<RiskLevel, { label: string; emoji: string }> = {
  baixo: { label: "Baixo", emoji: "🟢" },
  medio: { label: "Médio", emoji: "🟡" },
  alto: { label: "Alto", emoji: "🔴" },
};

export const LEVEL5_LABEL: Record<Level5, string> = {
  muito_baixa: "Muito baixa",
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  muito_alta: "Muito alta",
};

export const LEVEL5_MASC_LABEL: Record<Level5Masc, string> = {
  muito_baixo: "Muito baixo",
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  muito_alto: "Muito alto",
};

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

export type ScriptObjective =
  | "vender"
  | "engajar"
  | "educar"
  | "atrair_seguidores"
  | "fortalecer_marca";

export type ScriptStyle = "viral" | "educativo" | "comercial" | "storytelling" | "humor";

export const OBJECTIVE_LABEL: Record<ScriptObjective, string> = {
  vender: "Vender",
  engajar: "Engajar",
  educar: "Educar",
  atrair_seguidores: "Atrair seguidores",
  fortalecer_marca: "Fortalecer marca",
};

export const STYLE_LABEL: Record<ScriptStyle, string> = {
  viral: "Viral",
  educativo: "Educativo",
  comercial: "Comercial",
  storytelling: "Storytelling",
  humor: "Humor",
};

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
