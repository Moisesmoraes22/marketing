import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { supabase } from "../lib/supabase.js";
import { groqClient } from "../lib/groq.js";
import type { Job } from "../lib/types.js";

const execFileAsync = promisify(execFile);

interface TranscriptionPayload {
  content_item_id: string;
  source_url: string;
}

function isTranscriptionPayload(
  payload: unknown,
): payload is TranscriptionPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return typeof p.content_item_id === "string" && typeof p.source_url === "string";
}

export async function runTranscriptionAgent(job: Job): Promise<void> {
  if (!isTranscriptionPayload(job.payload)) {
    throw new Error("payload inválido para job de transcrição");
  }

  const { content_item_id, source_url } = job.payload;
  const audioPath = path.join(tmpdir(), `${content_item_id}.mp3`);

  try {
    await execFileAsync("yt-dlp", [
      "-x",
      "--audio-format",
      "mp3",
      "-o",
      audioPath,
      source_url,
    ]);

    const transcription = await groqClient().audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: "whisper-large-v3",
      language: "pt",
    });

    const { error: analysisError } = await supabase.from("analyses").insert({
      content_item_id,
      type: "transcription",
      content: { text: transcription.text },
    });
    if (analysisError) throw new Error(analysisError.message);

    const { error: updateError } = await supabase
      .from("content_items")
      .update({ status: "analyzing" })
      .eq("id", content_item_id);
    if (updateError) throw new Error(updateError.message);

    const { error: jobError } = await supabase.from("jobs").insert({
      type: "analyze",
      payload: { content_item_id },
      status: "pending",
    });
    if (jobError) throw new Error(jobError.message);
  } finally {
    await unlink(audioPath).catch(() => {});
  }
}
