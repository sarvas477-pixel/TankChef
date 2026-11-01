// Static web server for TankChef, with an optional WebSocket relay.
// Start with: npm start

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, posix, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

// Only serve the game page, stylesheet, game modules, and bundled PeerJS library.
const PUBLIC = [
  /^\/index\.html$/,
  /^\/styles\.css$/,
  /^\/src\//,
  /^\/vendor\//,
  /^\/favicon\.ico$/,
];

export function createStaticHandler({ hasRelay = () => false } = {}) {
  return async function handleRequest(req, res) {
    let pathname;

    try {
      pathname = decodeURIComponent(
        new URL(req.url, 'http://localhost').pathname
      );
    } catch {
      res.writeHead(400, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Bad request');
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }

    if (pathname === '/healthz') {
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end(req.method === 'HEAD' ? undefined : 'ok');
      return;
    }

    if (pathname === '/relay.json') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(
        req.method === 'HEAD'
          ? undefined
          : JSON.stringify({ relay: Boolean(hasRelay()) })
      );
      return;
    }

    if (pathname === '/') pathname = '/index.html';
    else if (pathname.endsWith('/')) pathname += 'index.html';

    const normalized = posix.normalize(pathname);
    const unsafe =
      pathname.includes('\\') ||
      pathname.includes('\0') ||
      normalized !== pathname ||
      normalized.split('/').includes('..');

    // Avoid template literals here to keep this line simple to copy/edit.
    const file = resolve(root, '.' + normalized);
    const isPublic = PUBLIC.some((pattern) => pattern.test(normalized));

    if (unsafe || !file.startsWith(root + sep) || !isPublic) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Not found');
      return;
    }

    try {
      const info = await stat(file);
      if (!info.isFile()) {
        res.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
        });
        res.end('Not found');
        return;
      }

      const body = await readFile(file);
      const contentType =
        MIME_TYPES[extname(file).toLowerCase()] ||
        'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'EISDIR') {
        console.error('Error serving file:', error.message);
        res.writeHead(500, {
          'Content-Type': 'text/plain; charset=utf-8',
        });
        res.end('Internal server error');
        return;
      }

      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Not found');
    }
  };
}

export async function startServer(options = {}) {
  const port = options.port ?? (Number(process.env.PORT) || 8081);
  const host = options.host ?? process.env.HOST ?? '0.0.0.0';
  const quiet = options.quiet ?? false;

  let relay = null;
  const server = createServer(
    createStaticHandler({
      hasRelay: () => relay !== null,
    })
  );

  try {
    const relayModule = await import('./relay.js');
    relay = await relayModule.attachRelay(server);
  } catch (error) {
    if (!quiet) {
      console.warn(
        'Online relay disabled (' + error.message + '). Run npm install to enable it.'
      );
    }
  }

  await new Promise((resolveListen, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolveListen();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });

  const address = server.address();
  if (!quiet) {
    const displayHost =
      host === '0.0.0.0' || host === '127.0.0.1' ? 'localhost' : host;
    console.log(
      'TankChef running at http://' +
        displayHost +
        ':' +
        address.port +
        (relay ? ' (relay on /ws)' : '')
    );
  }

  return {
    server,
    relay,
    port: address.port,
    close: () =>
      new Promise((done, reject) => {
        if (relay && typeof relay.close === 'function') relay.close();
        server.close((error) => {
          if (error) reject(error);
          else done();
        });
        if (typeof server.closeAllConnections === 'function') {
          server.closeAllConnections();
        }
      }),
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  startServer().catch((error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        'Port ' + (Number(process.env.PORT) || 8081) +
          ' is already in use. Try: $env:PORT=8082; npm start'
      );
    } else {
      console.error('Failed to start server:', error.message);
    }
    process.exitCode = 1;
  });
}
