export default async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers });

  try {
    const url = new URL(req.url);
    const mcUsername = url.searchParams.get("username");
    const discordId = url.searchParams.get("discord_id");
    const apiKey = process.env.HYPIXEL_API_KEY;

    if (!mcUsername || !discordId) return new Response(JSON.stringify({ error: "Missing username or discord_id" }), { status: 400, headers });
    if (!apiKey) return new Response(JSON.stringify({ error: "Server missing API key" }), { status: 500, headers });

    // Get UUID from Mojang
    const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(mcUsername)}`);
    if (!mojangRes.ok) return new Response(JSON.stringify({ verified: false, error: "Minecraft username not found" }), { status: 200, headers });
    const mojangData = await mojangRes.json();
    const uuid = mojangData.id;
    const correctName = mojangData.name;

    // Get Hypixel profile to check Discord link
    const hypixelRes = await fetch(`https://api.hypixel.net/v2/player?key=${apiKey}&uuid=${uuid}`);
    if (!hypixelRes.ok) return new Response(JSON.stringify({ verified: false, error: "Hypixel API error" }), { status: 200, headers });
    const hypixelData = await hypixelRes.json();

    if (!hypixelData.player) return new Response(JSON.stringify({ verified: false, error: "Player not found on Hypixel" }), { status: 200, headers });

    const linkedDiscord = hypixelData.player?.socialMedia?.links?.DISCORD || "";

    // Discord IDs in Hypixel are stored as "username" or "username#1234" - we need to compare
    // We'll pass the Discord username from the frontend and compare
    const discordUsername = url.searchParams.get("discord_username") || "";

    // Check if the linked Discord matches (case-insensitive)
    const match = linkedDiscord && discordUsername &&
      (linkedDiscord.toLowerCase() === discordUsername.toLowerCase() ||
       linkedDiscord.toLowerCase() === discordId);

    return new Response(JSON.stringify({
      verified: match,
      uuid: uuid,
      username: correctName,
      linkedDiscord: linkedDiscord ? linkedDiscord.substring(0, 3) + "***" : "none",
      error: match ? null : "Discord account linked on Hypixel does not match. Make sure you've linked your Discord in Hypixel using /discord link"
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/hypixel-verify" };
