const https = require("https");
const http = require("http");
const dns = require("dns").promises;
const { readJsonBody, sendJson } = require("../../lib/http");

const ALLOWED_PROTOCOLS = ["http:", "https:"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const PRIVATE_IP_RE = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
];

const isPrivateIp = (ip) => PRIVATE_IP_RE.some((r) => r.test(ip));

async function hostnameResolvesToPrivate(hostname) {
  try {
    const addrs = await dns.resolve(hostname);
    return addrs.some(isPrivateIp);
  } catch {
    return false;
  }
}

function fetchSingleHop(url) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return reject(new Error("Invalid URL"));
    }

    const client = parsed.protocol === "https:" ? https : http;
    const request = client.get(url, (upstream) => resolve(upstream));
    request.on("error", (err) => reject(err));
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

// Validate the hostname for each URL before making a connection,
// then follow redirects one hop at a time so every target is checked.
async function fetchWithRedirects(url, redirectsLeft = MAX_REDIRECTS) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are allowed");
  }

  if (await hostnameResolvesToPrivate(parsed.hostname)) {
    throw new Error("Access to private or internal addresses is not allowed");
  }

  const upstream = await fetchSingleHop(url);
  const status = upstream.statusCode;

  if (REDIRECT_STATUSES.has(status)) {
    upstream.resume(); // consume body to free socket
    if (redirectsLeft <= 0) {
      throw new Error("Too many redirects");
    }
    const location = upstream.headers["location"];
    if (!location) {
      throw new Error(`Redirect with no Location header (status ${status})`);
    }
    let nextUrl;
    try {
      nextUrl = new URL(location, url).toString();
    } catch {
      throw new Error("Invalid redirect URL");
    }
    // Recurse — the private-IP check runs again for nextUrl
    return fetchWithRedirects(nextUrl, redirectsLeft - 1);
  }

  return upstream;
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
    const statusCode = /not allowed/i.test(err.message) ? 400 : 502;
    return sendJson(res, statusCode, { error: err.message || "Failed to fetch URL" });
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
      if (!aborted) res.end();
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
