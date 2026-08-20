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
