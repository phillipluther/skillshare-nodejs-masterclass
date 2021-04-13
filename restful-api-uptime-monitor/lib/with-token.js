const dataCrud = require('./data-crud');

function withToken(tokenizedFunc) {
  return function(data, callback) {
    const { token } = data.headers;
    const $this = this;
    const phone = data.queryParams.get('phone') || data.payload.phone;

    if ((typeof token === 'string') || (typeof phone === 'string')) {
      // tokenHandlers.verifyToken(token, phone, (isValidToken) => {
      dataCrud.read('tokens', token, (err, tokenData) => {
        if (!err && (tokenData?.phone === phone) && (tokenData?.expires > Date.now())) {
          tokenizedFunc.call($this, data, callback);
        } else {
          callback(403, { error: 'Token is invalid' });
        }
      });
    } else {
      callback(403, { error: 'Token is required' });
    }  
  }
}

module.exports = withToken;
