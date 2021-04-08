const http = require('http');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');

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
    const handler = (typeof router[pathname] !== 'undefined')
      ? router[pathname]
      : handlers.notFound;

    const reqData = {
      pathname,
      method,
      queryParams,
      headers,
      payload: buffer + decoder.end(),
    };

    handler(reqData, (statusCode = 200, payload = {}) => {
      const payloadString = JSON.stringify(payload);

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // debugging/details
      const groupName = `[${method} /${pathname}]`;

      console.group(groupName);
        console.group('Request');
          console.log('Params:', queryParams);
          console.log('Headers:', headers);
          console.log('Payload:', buffer);
        console.groupEnd('Request');

        console.group('Response');
          console.log('Status:', statusCode);
          console.log('Payload:', payloadString || 'none');
        console.groupEnd('Response');
      console.groupEnd(groupName);
      console.log('\n');
    });
  });
});

server.listen(config.port, () => {
  console.log(`Server is listening on port ${config.port} in ${config.env} mode`);
});

// route handles
const handlers = {
  sample: (data, callback) => {
    callback(406, { name: 'sample handler' });
  },
  notFound: (data, callback) => {
    callback(404);
  },
};

// eventually break this out. probably.
const router = {
  'sample': handlers.sample
}
