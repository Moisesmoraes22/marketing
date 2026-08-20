export type JobType =
  | "discover"
  | "transcribe"
  | "analyze"
  | "critique"
  | "generate_script";

export type JobStatus = "pending" | "running" | "done" | "error";

export interface Job {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export type AgentHandler = (job: Job) => Promise<void>;
