import express from "express";
import { registerHandler, startPoller } from "./poller.js";
import { runDiscoveryAgent } from "./agents/discovery.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

registerHandler("discover", runDiscoveryAgent);

app.listen(PORT, () => {
  console.log(`[worker] escutando na porta ${PORT}`);
  startPoller();
});
