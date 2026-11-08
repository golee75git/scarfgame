var visitKey = "scarf-page-visits";

function wholeCount(value) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^[0-9]+$/.test(value)) {
    var parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

module.exports = async function (request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "method" });
    return;
  }

  var base = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) {
    response.status(503).json({ error: "unready" });
    return;
  }

  try {
    var storeReply = await fetch(base.replace(/\/$/, "") + "/incr/" + visitKey, {
      method: "POST",
      headers: { Authorization: "Bearer " + token }
    });
    if (!storeReply.ok) {
      response.status(502).json({ error: "store" });
      return;
    }
    var payload = await storeReply.json();
    var count = wholeCount(payload && payload.result);
    if (count === null) {
      response.status(502).json({ error: "store" });
      return;
    }
    response.status(200).json({ visits: count });
  } catch (err) {
    response.status(502).json({ error: "store" });
  }
};
