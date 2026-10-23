import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const port = 4174;
const videoPath = fileURLToPath(new URL('../fixtures/red.webm', import.meta.url));
const blueSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><rect width="240" height="120" fill="#0066ff"/></svg>`;

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  response.setHeader('Cache-Control', 'no-store');

  if (url.pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('ok');
    return;
  }

  if (url.pathname === '/blue.svg') {
    response.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    response.end(blueSvg);
    return;
  }

  if (url.pathname === '/red.webm') {
    try {
      const video = await readFile(videoPath);
      response.writeHead(200, { 'Content-Type': 'video/webm' });
      response.end(video);
    } catch {
      response.writeHead(404);
      response.end('not found');
    }
    return;
  }

  response.writeHead(404);
  response.end('not found');
});

server.listen(port, '127.0.0.1');
