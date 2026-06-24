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
      if (!p) return { buyOrder: 0, instaBuy: 0 };
      // Use exact top order prices from summary, fall back to quick_status
      // buy_summary = sell orders (what you pay to insta-buy, HIGHER)
      // sell_summary = buy orders (what buyers offer, LOWER = buy order price)
      const instaBuyPrice = (p.buy_summary && p.buy_summary[0]) ? p.buy_summary[0].pricePerUnit : (p.quick_status?.sellPrice || 0);
      const buyOrderPrice = (p.sell_summary && p.sell_summary[0]) ? p.sell_summary[0].pricePerUnit : (p.quick_status?.buyPrice || 0);
      return {
        buyOrder: buyOrderPrice,
        instaBuy: instaBuyPrice
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
      ESSENCE_WITHER: getPrice("ESSENCE_WITHER"),
      TARANTULA_SILK: getPrice("TARANTULA_SILK"),
      TESSELLATED_ENDER_PEARL: getPrice("TESSELLATED_ENDER_PEARL"),
      ENCHANTED_LAPIS_LAZULI_BLOCK: getPrice("ENCHANTED_LAPIS_LAZULI_BLOCK"),
      ABSOLUTE_ENDER_PEARL: getPrice("ABSOLUTE_ENDER_PEARL"),
      BRAIDED_GRIFFIN_FEATHER: getPrice("BRAIDED_GRIFFIN_FEATHER"),
      GRIFFIN_FEATHER: getPrice("GRIFFIN_FEATHER"),
      SOUL_STRING: getPrice("SOUL_STRING"),
      NULL_BLADE: getPrice("NULL_BLADE"),
      NULL_OVOID: getPrice("NULL_OVOID"),
      NULL_EDGE: getPrice("NULL_EDGE"),
      ENCHANTED_QUARTZ_BLOCK: getPrice("ENCHANTED_QUARTZ_BLOCK"),
      ENCHANTED_MITHRIL: getPrice("ENCHANTED_MITHRIL"),
      NULL_ATOM: getPrice("NULL_ATOM"),
      TARANTULA_WEB: getPrice("TARANTULA_WEB"),
      ENCHANTED_FLINT: getPrice("ENCHANTED_FLINT"),
      ENCHANTED_LAPIS_LAZULI: getPrice("ENCHANTED_LAPIS_LAZULI"),
      ENCHANTED_ENDER_PEARL: getPrice("ENCHANTED_ENDER_PEARL"),
      NULL_SPHERE: getPrice("NULL_SPHERE"),
      ENCHANTED_OBSIDIAN: getPrice("ENCHANTED_OBSIDIAN"),
      ENCHANTED_QUARTZ: getPrice("ENCHANTED_QUARTZ"),
      VERY_CRUDE_GABAGOOL: getPrice("VERY_CRUDE_GABAGOOL"),
      ENCHANTED_COAL: getPrice("ENCHANTED_COAL"),
      ENCHANTED_SULPHUR: getPrice("ENCHANTED_SULPHUR"),
      CRUDE_GABAGOOL_DISTILLATE: getPrice("CRUDE_GABAGOOL_DISTILLATE"),
      INFERNO_FUEL_BLOCK: getPrice("INFERNO_FUEL_BLOCK"),
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
