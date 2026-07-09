export default async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers });

  try {
    const url = new URL(req.url);
    const uuid = url.searchParams.get("uuid");
    const apiKey = process.env.HYPIXEL_API_KEY;

    if (!uuid) return new Response(JSON.stringify({ error: "Missing uuid" }), { status: 400, headers });
    if (!apiKey) return new Response(JSON.stringify({ error: "Server missing API key" }), { status: 500, headers });

    const res = await fetch(`https://api.hypixel.net/v2/skyblock/profiles?uuid=${uuid}`, {headers: {"API-Key": apiKey}});
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return new Response(JSON.stringify({ error: "Hypixel API " + res.status + ": " + errBody.substring(0, 200) }), { status: 200, headers });
    }
    const data = await res.json();

    if (!data.profiles || data.profiles.length === 0) {
      return new Response(JSON.stringify({ purse: 0 }), { status: 200, headers });
    }

    // Find selected profile
    const profile = data.profiles.find(p => p.selected) || data.profiles[0];
    const cleanUuid = uuid.replace(/-/g, "");
    const member = profile.members && profile.members[cleanUuid];

    if (!member) {
      return new Response(JSON.stringify({ purse: 0 }), { status: 200, headers });
    }

    // Purse can be in different locations depending on API version
    const purse = member.currencies?.coin_purse || member.coin_purse || 0;

    return new Response(JSON.stringify({ purse: Math.floor(purse) }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/hypixel-profile" };
