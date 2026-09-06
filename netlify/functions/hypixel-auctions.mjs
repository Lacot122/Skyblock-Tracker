export default async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers });

  try {
    const url = new URL(req.url);
    const uuidsParam = url.searchParams.get("uuids") || url.searchParams.get("uuid");
    const apiKey = process.env.HYPIXEL_API_KEY;

    if (!uuidsParam) return new Response(JSON.stringify({ error: "Missing uuid" }), { status: 400, headers });
    if (!apiKey) return new Response(JSON.stringify({ error: "Server missing API key" }), { status: 500, headers });

    const uuids = uuidsParam.split(",").map(u => u.trim()).filter(Boolean);

    const fetchForUuid = async (uuid) => {
      const res = await fetch(`https://api.hypixel.net/v2/skyblock/auction?player=${uuid}`, { headers: { "API-Key": apiKey } });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        return { error: "Hypixel API " + res.status + ": " + errBody.substring(0, 200), uuid };
      }
      const data = await res.json();
      if (!data.success || !data.auctions) return { active: [], sold: [], uuid };

      const now = Date.now();
      const active = [];
      const sold = [];
      let toCollect = 0, ifAllSold = 0, listedValue = 0;

      for (const a of data.auctions) {
        const isBin = !!a.bin;
        const endsAt = a.end;
        const price = isBin ? a.starting_bid : (a.highest_bid_amount || a.starting_bid);
        const itemName = a.item_name || "Unknown Item";
        const tier = a.tier || "COMMON";

        if (a.claimed) {
          continue;
        } else if (endsAt > now) {
          active.push({ auctionId: a.uuid, itemName, tier, bin: isBin, price, currentBid: a.highest_bid_amount || 0, endsAt });
          listedValue += price;
        } else {
          const soldAt = endsAt;
          sold.push({ auctionId: a.uuid, itemName, tier, bin: isBin, price, soldAt });
          if (a.highest_bid_amount > 0 || isBin) toCollect += price;
        }
      }
      ifAllSold = toCollect + listedValue;

      return { active, sold, stats: { toCollect, ifAllSold, listedValue }, uuid };
    };

    const results = await Promise.all(uuids.map(fetchForUuid));

    const merged = { active: [], sold: [], stats: { toCollect: 0, ifAllSold: 0, listedValue: 0 } };
    const errors = [];
    for (const r of results) {
      if (r.error) { errors.push(r); continue; }
      merged.active.push(...(r.active || []).map(a => ({ ...a, ownerUuid: r.uuid })));
      merged.sold.push(...(r.sold || []).map(a => ({ ...a, ownerUuid: r.uuid })));
      if (r.stats) {
        merged.stats.toCollect += r.stats.toCollect;
        merged.stats.ifAllSold += r.stats.ifAllSold;
        merged.stats.listedValue += r.stats.listedValue;
      }
    }

    return new Response(JSON.stringify({ ...merged, errors }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/hypixel-auctions" };
