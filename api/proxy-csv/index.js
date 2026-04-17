const https = require("https");
const http = require("http");
const { readJsonBody, sendJson } = require("../_lib/http");

const ALLOWED_PROTOCOLS = ["http:", "https:"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: "Invalid request body" });
  }

  const url = (body.url || "").trim();
  if (!url) {
    return sendJson(res, 400, { error: "url is required" });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return sendJson(res, 400, { error: "Invalid URL" });
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return sendJson(res, 400, { error: "Only http and https URLs are allowed" });
  }

  const client = parsed.protocol === "https:" ? https : http;

  return new Promise((resolve) => {
    const request = client.get(url, (upstream) => {
      const status = upstream.statusCode;
      if (status < 200 || status >= 300) {
        res.statusCode = 502;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: `Upstream returned status ${status}` }));
        resolve();
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");

      let received = 0;
      let aborted = false;

      upstream.on("data", (chunk) => {
        received += chunk.length;
        if (received > MAX_SIZE_BYTES) {
          aborted = true;
          upstream.destroy();
          res.statusCode = 413;
          res.end();
          resolve();
          return;
        }
        res.write(chunk);
      });

      upstream.on("end", () => {
        if (!aborted) {
          res.end();
        }
        resolve();
      });

      upstream.on("error", (err) => {
        if (!aborted && !res.headersSent) {
          res.statusCode = 502;
          res.end();
        }
        resolve();
      });
    });

    request.on("error", (err) => {
      if (!res.headersSent) {
        res.statusCode = 502;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: `Request failed: ${err.message}` }));
      }
      resolve();
    });

    request.setTimeout(10000, () => {
      request.destroy();
      if (!res.headersSent) {
        res.statusCode = 504;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Request timed out" }));
      }
      resolve();
    });
  });
};
