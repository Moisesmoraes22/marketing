import express from "express";
import { startPoller } from "./poller.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[worker] escutando na porta ${PORT}`);
  startPoller();
});
