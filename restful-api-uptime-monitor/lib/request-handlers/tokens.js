const dataCrud = require('../data-crud');
const helpers = require('../helpers');

const tokenHandlers = {
  GET: (data, callback) => {
    const { queryParams } = data;
    const tokenId = queryParams.get('token');

    if (tokenId) {
      dataCrud.read('tokens', tokenId, (err, tokenData) => {
        if (!err && tokenData) {
          callback(200, tokenData);
        } else {
          callback(404);
        }
      });
    } else {
      callback(400, { error: 'Field `token` is required' });
    }
  },
  POST: (data, callback) => {
    const fieldErrors = helpers.getFieldErrors(data.payload, ['phone', 'password']);
    const { phone, password } = data.payload;

    if (fieldErrors.length === 0) {
      dataCrud.read('users', phone, (err, userData) => {
        if (!err && userData) {
          if (helpers.hash(password) === userData.password) {
            const tokenId = helpers.createRandomString(24);
            const expires = Date.now() + 1000 * 60 * 60; // token is good for an hour
            const tokenData = {
              id: tokenId,
              expires,
              phone,
            };

            dataCrud.create('tokens', tokenId, tokenData, (err) => {
              if (!err) {
                callback(200, tokenData);
              } else {
                callback(500, { error: 'Failed to create token' });
              }
            });
          } else {
            callback(400, { error: 'Invalid phone and password combination' });
          }
        } else {
          callback(400, { error: `Could not find user ${phone}` });
        }
      });
    } else {
      callback(400, fieldErrors[0]);
    }
  },
  PUT: (data, callback) => {
    const { id: tokenId, extend } = data.payload;

    if (tokenId && (extend === true)) {
      dataCrud.read('tokens', tokenId, (err, tokenData) => {
        if (!err && tokenData) {
          if (tokenData.expires > Date.now()) {
            tokenData.expires = Date.now() * 1000 * 60 * 60;

            dataCrud.update('tokens', tokenId, tokenData, (err) => {
              if (!err) {
                callback(200);
              } else {
                callback(500, { error: `Failed to extend token ${tokenId}` });
              }
            });
          } else {
            callback(400, { error: `Token ${tokenId} is expired` });
          }
        } else {
          callback(400, { error: `Token ${tokenId} was not found` })
        }
      });
    } else {
      callback(400, { error: 'Invalid request to extend token' });
    }
  },
  DELETE: (data, callback) => {
    const { queryParams } = data;
    const tokenId = queryParams.get('token');

    if (typeof tokenId === 'string') {
      dataCrud.read('tokens', tokenId, (err, tokenData) => {
        if (!err && tokenData) {
          dataCrud.delete('tokens', tokenId, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { error: `Failed to delete token ${tokenId}` });
            }
          });
        } else {
          callback(400, { error: `Token ${tokenId} was not found` });
        }
      });
    } else {
      callback(400, { error: 'Field `token` is required' });
    }
  },
  verify: (tokenId, phone, callback) => {
    const { fieldValidations } = helpers;

    if (fieldValidations.token(tokenId) && fieldValidations.phone(phone)) {
      dataCrud.read('tokens', tokenId, (err, tokenObj) => {
        if (!err && tokenObj) {
          callback((tokenObj?.phone === phone) && (tokenObj.expires > Date.now()));
        } else {
          callback(false);
        }
      });
    } else {
      callback(false);
    }
  },
};

module.exports = tokenHandlers;
