import http from "node:http";
import https from "node:https";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || "4173");
const BACKEND = new URL(process.env.BACKEND || "http://127.0.0.1:5212");
const BUILD_DIR = path.resolve(__dirname, "..", "build");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

function shouldProxy(pathname) {
  if (pathname === "/manifest.json") return true;
  if (pathname === "/api" || pathname.startsWith("/api/")) return true;
  if (pathname === "/s" || pathname.startsWith("/s/")) return true;
  if (pathname === "/f" || pathname.startsWith("/f/")) return true;
  return false;
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function safeDecodePathname(urlPathname) {
  try {
    return decodeURIComponent(urlPathname);
  } catch {
    return null;
  }
}

function resolveBuildPath(urlPathname) {
  const decoded = safeDecodePathname(urlPathname);
  if (decoded == null) return null;

  const pathname = decoded.startsWith("/") ? decoded : `/${decoded}`;
  const abs = path.resolve(BUILD_DIR, `.${pathname}`);

  const rootWithSep = BUILD_DIR.endsWith(path.sep) ? BUILD_DIR : BUILD_DIR + path.sep;
  if (abs !== BUILD_DIR && !abs.startsWith(rootWithSep)) return null;
  return abs;
}

async function serveFile(req, res, absPath) {
  const ext = path.extname(absPath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";

  let st;
  try {
    st = await fs.stat(absPath);
  } catch {
    send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not Found");
    return;
  }

  if (!st.isFile()) {
    send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not Found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": String(st.size),
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const stream = createReadStream(absPath);
  stream.on("error", () => {
    if (!res.headersSent) {
      send(res, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Internal Server Error");
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

async function serveIndex(req, res) {
  await serveFile(req, res, path.join(BUILD_DIR, "index.html"));
}

function proxyToBackend(req, res) {
  const targetUrl = new URL(req.url || "/", BACKEND);
  const isHttps = targetUrl.protocol === "https:";
  const requestFn = isHttps ? https.request : http.request;

  const headers = { ...req.headers, host: targetUrl.host };

  const proxyReq = requestFn(
    {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      method: req.method,
      path: targetUrl.pathname + targetUrl.search,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", () => {
    if (!res.headersSent) {
      send(res, 502, { "Content-Type": "text/plain; charset=utf-8" }, "Bad Gateway");
    } else {
      res.destroy();
    }
  });

  req.on("aborted", () => proxyReq.destroy());
  req.on("error", () => proxyReq.destroy());

  if (req.method === "GET" || req.method === "HEAD") {
    proxyReq.end();
  } else {
    req.pipe(proxyReq);
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad Request");
    return;
  }

  const { pathname } = new URL(req.url, `http://${HOST}:${PORT}`);

  if (shouldProxy(pathname)) {
    proxyToBackend(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, { "Content-Type": "text/plain; charset=utf-8" }, "Method Not Allowed");
    return;
  }

  const absPath = resolveBuildPath(pathname);
  if (absPath == null) {
    send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad Request");
    return;
  }

  // Try to serve a real file first.
  try {
    const st = await fs.stat(absPath);
    if (st.isFile()) {
      await serveFile(req, res, absPath);
      return;
    }
    if (st.isDirectory()) {
      const idx = path.join(absPath, "index.html");
      const idxSt = await fs.stat(idx).catch(() => null);
      if (idxSt && idxSt.isFile()) {
        await serveFile(req, res, idx);
        return;
      }
    }
  } catch {
    // Fall through to SPA fallback / 404.
  }

  // SPA fallback: for routes that do not look like files.
  if (path.extname(pathname) === "") {
    await serveIndex(req, res);
    return;
  }

  send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not Found");
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`e2e preview server: http://${HOST}:${PORT}\n`);
});
