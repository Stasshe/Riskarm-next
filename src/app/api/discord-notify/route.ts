import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface DiscordNotifyRequestBody {
  message: string;
}

function isDiscordNotifyRequestBody(value: unknown): value is DiscordNotifyRequestBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const message = (value as Record<string, unknown>).message;
  return typeof message === "string" && message.trim().length > 0;
}

/**
 * Relays a message to the Discord webhook configured in the server
 * environment. This is the only server-side logic in the app (the rest of
 * the app talks to Firestore directly from the client) — see plan §5.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const sharedSecret = process.env.APP_SHARED_SECRET;
  if (sharedSecret) {
    const providedSecret = request.headers.get("x-app-secret");
    if (providedSecret !== sharedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isDiscordNotifyRequestBody(body)) {
    return NextResponse.json(
      { error: "Request body must contain a non-empty 'message' string" },
      { status: 400 },
    );
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    // Intentional no-op default, matching the original app's silent skip
    // when no webhook is configured (see plan §5).
    return new NextResponse(null, { status: 204 });
  }

  try {
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "open-riskarm", content: body.message }),
    });

    if (discordResponse.ok) {
      return new NextResponse(null, { status: 204 });
    }

    const errorText = await discordResponse.text();
    return NextResponse.json(
      { error: `Discord webhook responded with status ${discordResponse.status}: ${errorText}` },
      { status: discordResponse.status },
    );
  } catch (error) {
    console.error("Discord webhook request failed", error);
    return NextResponse.json({ error: "Failed to reach Discord webhook" }, { status: 502 });
  }
}
