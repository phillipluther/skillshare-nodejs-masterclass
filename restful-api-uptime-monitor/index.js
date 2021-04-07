const http = require('http');
// const url = require('url');

const server = http.createServer((req, res) => {
  const baseUrl = `http://${req.headers.host}/`; // can always smarten this up later
  const parsedUrl = new URL(req.url, baseUrl);
  const pathname = parsedUrl.pathname.replace(/^\/+|\/+$/g, ''); // trim slashes for sanity

  res.end('OK\n');
  console.log(`Request received on ${pathname}`);
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
