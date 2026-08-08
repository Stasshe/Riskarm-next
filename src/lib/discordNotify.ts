/**
 * Thin client wrapper around /api/discord-notify. Discord is a side-channel
 * notification, not the primary action, so a Discord outage must never
 * block the Firestore mutation that triggered it: failures are logged, not
 * thrown. (Exception to this project's "no silent degradation" rule,
 * scoped specifically to this notification side-channel.)
 */
export async function notifyDiscord(message: string): Promise<void> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // Client-readable by design (NEXT_PUBLIC_*): this is light spam
    // deterrence for the notify endpoint, not real authentication.
    const sharedSecret = process.env.NEXT_PUBLIC_APP_SHARED_SECRET;
    if (sharedSecret) {
      headers["x-app-secret"] = sharedSecret;
    }
    const response = await fetch("/api/discord-notify", {
      method: "POST",
      headers,
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      console.error(`Discord notification failed with status ${response.status}`);
    }
  } catch (error) {
    console.error("Discord notification request failed", error);
  }
}
