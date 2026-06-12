export default async (req) => {
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers });

  try {
    const apiKey = process.env.HYPIXEL_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "Server missing API key" }), { status: 500, headers });

    const res = await fetch(`https://api.hypixel.net/v2/skyblock/bazaar?key=${apiKey}`);
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return new Response(JSON.stringify({ error: "Hypixel API " + res.status + ": " + errBody.substring(0, 200) }), { status: 200, headers });
    }

    const data = await res.json();
    if (!data.products) return new Response(JSON.stringify({ error: "No bazaar data" }), { status: 200, headers });

    // Extract prices for craft items
    const getPrice = (id) => {
      const p = data.products[id];
      if (!p || !p.quick_status) return { buyOrder: 0, instaBuy: 0 };
      return {
        buyOrder: p.quick_status.sellPrice || 0,
        instaBuy: p.quick_status.buyPrice || 0
      };
    };

    const prices = {
      SHADOW_WARP_SCROLL: getPrice("SHADOW_WARP_SCROLL"),
      WITHER_SHIELD_SCROLL: getPrice("WITHER_SHIELD_SCROLL"),
      IMPLOSION_SCROLL: getPrice("IMPLOSION_SCROLL"),
      WITHER_CATALYST: getPrice("WITHER_CATALYST"),
      LASR_EYE: getPrice("L.A.S.R.'s_Eye") || getPrice("LASR_EYE") || getPrice("L_A_S_R_EYE"),
      RECOMBOBULATOR_3000: getPrice("RECOMBOBULATOR_3000"),
      ENCHANTMENT_ULTIMATE_WISE_5: getPrice("ENCHANTMENT_ULTIMATE_WISE_5"),
      FLAWLESS_SAPPHIRE_GEM: getPrice("FLAWLESS_SAPPHIRE_GEM"),
      FLAWLESS_JASPER_GEM: getPrice("FLAWLESS_JASPER_GEM"),
      FLAWLESS_RUBY_GEM: getPrice("FLAWLESS_RUBY_GEM"),
      FLAWLESS_AMETHYST_GEM: getPrice("FLAWLESS_AMETHYST_GEM"),
      PERFECT_SAPPHIRE_GEM: getPrice("PERFECT_SAPPHIRE_GEM"),
      HOT_POTATO_BOOK: getPrice("HOT_POTATO_BOOK"),
      TITANIC_EXP_BOTTLE: getPrice("TITANIC_EXP_BOTTLE"),
    };

    // Try alternate bazaar IDs for L.A.S.R's Eye
    if (prices.LASR_EYE.buyOrder === 0) {
      // Search through all products for anything with LASR or laser
      for (const key of Object.keys(data.products)) {
        if (key.toUpperCase().includes("LASR") || key.toUpperCase().includes("LASER")) {
          prices.LASR_EYE = getPrice(key);
          prices.LASR_EYE_ID = key;
          break;
        }
      }
    }

    return new Response(JSON.stringify({ prices, timestamp: Date.now() }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/hypixel-bazaar" };
