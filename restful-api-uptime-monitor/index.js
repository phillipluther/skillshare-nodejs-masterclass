const http = require('http');
const StringDecoder = require('string_decoder').StringDecoder;

const server = http.createServer((req, res) => {
  const baseUrl = `http://${req.headers.host}/`; // can always smarten this up later
  const parsedUrl = new URL(req.url, baseUrl);

  // request basics
  const pathname = parsedUrl.pathname.replace(/^\/+|\/+$/g, ''); // trim slashes for sanity
  const method = req.method.toUpperCase(); // cap'd for normalization
  const queryParams = parsedUrl.searchParams;
  const headers = req.headers;

  // payload handling (streamed)
  const decoder = new StringDecoder('utf-8');
  let buffer = '';

  req.on('data', (data) => buffer += decoder.write(data));

  // response handling
  req.on('end', () => {
    buffer += decoder.end();

    res.end('OK\n');

    // debugging/details
    const groupName = `[${method}] Request received on ${pathname}`;
    console.group(groupName);
      console.log('Params:', queryParams);
      console.log('Headers:', headers);
      console.log('Payload:', buffer);
      console.log('\n');
    console.groupEnd(groupName);
  });
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
