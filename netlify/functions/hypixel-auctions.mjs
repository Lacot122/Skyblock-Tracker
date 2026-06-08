export default async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers });

  try {
    const url = new URL(req.url);
    const uuid = url.searchParams.get("uuid");
    const apiKey = process.env.HYPIXEL_API_KEY;

    if (!uuid) return new Response(JSON.stringify({ error: "Missing uuid" }), { status: 400, headers });
    if (!apiKey) return new Response(JSON.stringify({ error: "Server missing API key" }), { status: 500, headers });

    const res = await fetch(`https://api.hypixel.net/v2/skyblock/auction?key=${apiKey}&player=${uuid}`);
    if (!res.ok) return new Response(JSON.stringify({ error: "Hypixel API error" }), { status: 200, headers });
    const data = await res.json();

    if (!data.auctions) return new Response(JSON.stringify({ active: [], sold: [], stats: { toCollect: 0, ifAllSold: 0, listedValue: 0 } }), { status: 200, headers });

    const now = Date.now();
    const cutoff = new Date("2025-01-01").getTime();

    // Active auctions (not ended yet)
    const active = data.auctions
      .filter(a => a.end > now && !a.claimed)
      .sort((a, b) => a.end - b.end)
      .map(a => ({
        auctionId: a.uuid,
        itemName: a.item_name,
        price: a.starting_bid,
        currentBid: a.highest_bid_amount || 0,
        endsAt: a.end,
        bin: a.bin || false,
        tier: a.tier || "COMMON"
      }));

    // Sold auctions (ended with bids, after Jan 2025)
    const sold = data.auctions
      .filter(a => a.end && a.end <= now && a.end >= cutoff && a.highest_bid_amount > 0)
      .sort((a, b) => b.end - a.end)
      .slice(0, 20)
      .map(a => ({
        auctionId: a.uuid,
        itemName: a.item_name,
        price: a.highest_bid_amount,
        soldAt: a.end,
        bin: a.bin || false,
        tier: a.tier || "COMMON",
        claimed: a.claimed || false
      }));

    // Stats
    const toCollect = data.auctions
      .filter(a => a.end && a.end <= now && a.highest_bid_amount > 0 && !a.claimed)
      .reduce((s, a) => s + a.highest_bid_amount, 0);

    const ifAllSold = active.reduce((s, a) => s + (a.bin ? a.price : a.price), 0);
    const listedValue = active.reduce((s, a) => s + a.price, 0);

    return new Response(JSON.stringify({ active, sold, stats: { toCollect, ifAllSold, listedValue } }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/hypixel-auctions" };
