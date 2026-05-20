const https = require("https");
const http = require("http");
const { readJsonBody, sendJson } = require("../../lib/http");

const ALLOWED_PROTOCOLS = ["http:", "https:"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Perform an HTTP GET that follows redirects, resolving to the final response stream.
 * Returns a Promise that resolves with the final IncomingMessage, or rejects on error/timeout/too-many-redirects.
 */
function fetchWithRedirects(url, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return reject(new Error("Invalid URL"));
    }

    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return reject(new Error("Only http and https URLs are allowed"));
    }

    const client = parsed.protocol === "https:" ? https : http;
    const request = client.get(url, (upstream) => {
      const status = upstream.statusCode;

      if (REDIRECT_STATUSES.has(status)) {
        // Consume the redirect response body to free up the socket
        upstream.resume();
        if (redirectsLeft <= 0) {
          return reject(new Error("Too many redirects"));
        }
        const location = upstream.headers["location"];
        if (!location) {
          return reject(new Error(`Redirect with no Location header (status ${status})`));
        }
        // Resolve relative redirects against the current URL
        let nextUrl;
        try {
          nextUrl = new URL(location, url).toString();
        } catch {
          return reject(new Error("Invalid redirect URL"));
        }
        fetchWithRedirects(nextUrl, redirectsLeft - 1).then(resolve, reject);
        return;
      }

      resolve(upstream);
    });

    request.on("error", (err) => reject(err));

    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

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

  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return sendJson(res, 400, { error: "Only http and https URLs are allowed" });
    }
  } catch {
    return sendJson(res, 400, { error: "Invalid URL" });
  }

  let upstream;
  try {
    upstream = await fetchWithRedirects(url, MAX_REDIRECTS);
  } catch (err) {
    return sendJson(res, 502, { error: err.message || "Failed to fetch URL" });
  }

  const status = upstream.statusCode;
  if (status < 200 || status >= 300) {
    upstream.resume();
    return sendJson(res, 502, { error: `Upstream returned status ${status}` });
  }

  return new Promise((resolve) => {
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
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err.message || "Stream error" }));
      }
      resolve();
    });
  });
};
