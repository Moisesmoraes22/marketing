import express from "express";
import { registerHandler, startPoller } from "./poller.js";
import { runDiscoveryAgent } from "./agents/discovery.js";
import { runTranscriptionAgent } from "./agents/transcription.js";
import { runAnalysisAgent } from "./agents/analysis.js";
import { runCritiqueAgent } from "./agents/critique.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

registerHandler("discover", runDiscoveryAgent);
registerHandler("transcribe", runTranscriptionAgent);
registerHandler("analyze", runAnalysisAgent);
registerHandler("critique", runCritiqueAgent);

app.listen(PORT, () => {
  console.log(`[worker] escutando na porta ${PORT}`);
  startPoller();
});
