const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');
const handler = require('./api/inscription.js');

const PUBLIC_DIR = path.resolve(__dirname);
const PORT = process.env.PORT || 8000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/vnd.microsoft.icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

function sendJSON(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function serveStatic(res, pathname) {
  const decodedPath = decodeURIComponent(pathname);
  let sanitizedPath = decodedPath.replace(/^\/+/, '');
  if (!sanitizedPath || sanitizedPath === '/') {
    sanitizedPath = 'index.html';
  }

  const resolvedPath = path.resolve(PUBLIC_DIR, sanitizedPath);
  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    return sendJSON(res, 403, { message: 'Accès refusé.' });
  }

  try {
    const stat = await fs.stat(resolvedPath);
    if (stat.isDirectory()) {
      return serveStatic(res, path.posix.join(pathname, 'index.html'));
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const data = await fs.readFile(resolvedPath);

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return sendJSON(res, 404, { message: 'Fichier introuvable.' });
    }
    sendJSON(res, 500, { message: 'Erreur de lecture du fichier.', detail: error.message });
  }
}

async function parseRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 10_000_000) {
      throw new Error('Payload trop volumineux.');
    }
  }
  return Buffer.concat(chunks).toString('utf-8');
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    if (pathname === '/api/inscription') {
      if (req.method !== 'POST') {
        return sendJSON(res, 405, { message: 'Méthode non autorisée.' });
      }

      const rawBody = await parseRequestBody(req);
      const contentType = (req.headers['content-type'] || '').split(';')[0].trim();

      if (contentType === 'application/json') {
        try {
          req.body = rawBody ? JSON.parse(rawBody) : {};
        } catch (error) {
          return sendJSON(res, 400, { message: 'JSON invalide.' });
        }
      } else if (contentType === 'application/x-www-form-urlencoded') {
        req.body = Object.fromEntries(new URLSearchParams(rawBody));
      } else {
        req.body = {};
      }

      res.status = function (code) {
        res.statusCode = code;
        return res;
      };
      res.json = function (value) {
        if (!res.hasHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        res.end(JSON.stringify(value));
      };

      try {
        await handler(req, res);
      } catch (error) {
        sendJSON(res, 500, { message: 'Erreur interne du serveur API.', detail: error.message });
      }
      return;
    }

    await serveStatic(res, pathname);
  } catch (error) {
    sendJSON(res, 500, { message: 'Erreur du serveur.', detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
