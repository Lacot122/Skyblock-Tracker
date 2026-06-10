// Pings Hypixel API once daily to prevent key expiry from inactivity
export default async () => {
  const apiKey = process.env.HYPIXEL_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch(`https://api.hypixel.net/v2/key?key=${apiKey}`);
    const data = await res.json();
    console.log("API key keepalive:", data.success ? "OK" : "Failed - " + (data.cause || "unknown"));
  } catch (e) {
    console.log("API key keepalive error:", e.message);
  }
};

export const config = {
  schedule: "0 */12 * * *"  // Every 12 hours
};
