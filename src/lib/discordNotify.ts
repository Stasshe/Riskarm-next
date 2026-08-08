/**
 * Thin client wrapper around /api/discord-notify. Discord is a side-channel
 * notification, not the primary action, so a Discord outage must never
 * block the Firestore mutation that triggered it: failures are logged, not
 * thrown. (Exception to this project's "no silent degradation" rule,
 * scoped specifically to this notification side-channel.)
 */
export async function notifyDiscord(message: string): Promise<void> {
  try {
    const response = await fetch("/api/discord-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      console.error(`Discord notification failed with status ${response.status}`);
    }
  } catch (error) {
    console.error("Discord notification request failed", error);
  }
}
