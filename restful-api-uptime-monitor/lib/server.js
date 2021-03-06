const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const StringDecoder = require('string_decoder').StringDecoder;
const requestHandlers = require('./request-handlers');
const config = require('./config');
const helpers = require('./helpers');
const debug = require('util').debuglog('server');

const server = {
  // unified server, handling both http and https requests
  unifiedServer: (req, res) => {
    const protocol = req.connection.encrypted ? 'https' : 'http';
    const baseUrl = `${protocol}://${req.headers.host}/`; // can always smarten this up later
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
        : requestHandlers.notFound;
  
      const reqData = {
        pathname,
        method,
        queryParams,
        headers,
        payload: helpers.jsonToObject(buffer + decoder.end()),
      };
  
      handler(reqData, (statusCode = 200, payload = {}) => {
        const payloadString = JSON.stringify(payload);
  
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(statusCode);
        res.end(payloadString);
  
        // debugging/details
        const message = `[${statusCode}] ${method} /${pathname}`;
        const accentColor = (statusCode === 200) ? '\x1b[32m%s\x1b[0m' : '\x1b[31m%s\x1b[0m';

        debug(accentColor, message);

        // console.group(message);
        //   console.group('Request');
        //     console.log('Params:', queryParams);
        //     console.log('Headers:', headers);
        //     console.log('Payload:', buffer);
        //   console.groupEnd('Request');
  
        //   console.group('Response');
        //     console.log('Status:', statusCode);
        //     console.log('Payload:', payloadString || 'none');
        //   console.groupEnd('Response');
        // console.groupEnd(message);
        // console.log('\n');
      });
    });
  },
  init: () => {
    server.httpServer.listen(config.httpPort, () => {
      console.log(
        '\x1b[32m%s\x1b[0m',
        `[HTTP] Server is listening on port ${config.httpPort} in ${config.env} mode`,
      );
    });
    
    server.httpsServer.listen(config.httpsPort, () => {
      console.log(
        '\x1b[32m%s\x1b[0m',
        `[HTTPS] Server is listening on port ${config.httpsPort} in ${config.env} mode`,
      );
    });    
  },
}

server.httpServer = http.createServer(server.unifiedServer);
server.httpsServer = https.createServer({
  key: fs.readFileSync(path.join(__dirname, '../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem')),
}, server.unifiedServer);

// eventually break this out. probably.
const router = {
  checks: requestHandlers.checks,
  ping: requestHandlers.ping,
  tokens: requestHandlers.tokens,
  users: requestHandlers.users,
};

module.exports = server;
