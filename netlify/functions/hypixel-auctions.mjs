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

    // Detect if auction was sold: has bids, or claimed, or ended with highest bid
    const isSold = (a) => {
      if (a.bids && a.bids.length > 0) return true;
      if (a.highest_bid_amount > 0 && a.end && a.end <= now) return true;
      if (a.claimed_bidders && a.claimed_bidders.length > 0) return true;
      return false;
    };

    // Get the actual sell time: last bid timestamp, or end time
    const getSoldTime = (a) => {
      if (a.bids && a.bids.length > 0) {
        return Math.max(...a.bids.map(b => b.timestamp || 0));
      }
      return a.end || 0;
    };

    // Active auctions (not sold and not expired)
    const active = data.auctions
      .filter(a => !isSold(a) && a.end > now)
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

    // Sold auctions (after Jan 2025)
    const sold = data.auctions
      .filter(a => isSold(a) && getSoldTime(a) >= cutoff)
      .sort((a, b) => getSoldTime(b) - getSoldTime(a))
      .slice(0, 20)
      .map(a => ({
        auctionId: a.uuid,
        itemName: a.item_name,
        price: a.highest_bid_amount || a.starting_bid,
        soldAt: getSoldTime(a),
        bin: a.bin || false,
        tier: a.tier || "COMMON",
        claimed: a.claimed || false
      }));

    // Stats - coins to collect (sold but unclaimed, after 2025)
    const toCollect = data.auctions
      .filter(a => isSold(a) && !a.claimed && getSoldTime(a) >= cutoff)
      .reduce((s, a) => s + (a.highest_bid_amount || 0), 0);

    const ifAllSold = active.reduce((s, a) => s + (a.bin ? a.price : a.price), 0);
    const listedValue = active.reduce((s, a) => s + a.price, 0);

    return new Response(JSON.stringify({ active, sold, stats: { toCollect, ifAllSold, listedValue } }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/hypixel-auctions" };
