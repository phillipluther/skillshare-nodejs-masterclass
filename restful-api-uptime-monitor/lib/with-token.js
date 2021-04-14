// const dataCrud = require('./data-crud');
const tokensHandler = require('./request-handlers/tokens');

function withToken(tokenizedFunc) {
  return function(data, callback) {
    const { token } = data.headers;
    const $this = this;
    const phone = data.queryParams.get('phone') || data.payload.phone;

    tokensHandler.verify(token, phone, (isValidToken) => {
      if (isValidToken) {
        tokenizedFunc.call($this, data, callback);
      } else {
        callback(403, { error: 'Token is missing or invalid' });
      }
    });
  }
}

module.exports = withToken;
