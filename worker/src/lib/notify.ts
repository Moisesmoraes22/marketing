const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function notifyDiscord(message: string): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) return;

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch (err) {
    console.error("[notify] falha ao enviar notificação no Discord", err);
  }
}
