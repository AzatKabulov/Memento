import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

/** Serve an Expo static export with the same route fallback as the hosted PWA. */
export async function serveExport(directory) {
  const root = resolve(directory);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let target = resolve(root, '.' + pathname);
      if (target !== root && !target.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      try {
        if (!(await stat(target)).isFile()) target = resolve(root, 'index.html');
      } catch {
        if (extname(pathname)) { response.writeHead(404).end(); return; }
        target = resolve(root, 'index.html');
      }
      response.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream' });
      createReadStream(target).pipe(response);
    } catch {
      response.writeHead(500).end();
    }
  });
  await new Promise(resolveReady => server.listen(0, '127.0.0.1', resolveReady));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolveClosed => server.close(resolveClosed)),
  };
}
