// Local dev server mimicking Vercel: static files from public/, handlers from api/. Not used in production.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const port = process.env.PORT || 3000;

http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path.startsWith('/api/')) {
    if (!/^\/api\/[a-z]+$/.test(path)) return res.writeHead(404).end();
    try {
      return (await import(`.${path}.js`)).default(req, res);
    } catch {
      return res.writeHead(404).end();
    }
  }
  if (!/^\/[\w./-]*$/.test(path) || path.includes('..')) return res.writeHead(404).end();
  try {
    const file = join('public', path.endsWith('/') ? `${path}index.html` : path);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
