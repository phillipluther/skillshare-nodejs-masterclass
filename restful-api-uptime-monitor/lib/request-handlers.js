const dataCrud = require('./data-crud');
const helpers = require('./helpers');

// fairly sloppy validation logic, but good enough for our tut purposes
const fieldValidations = {
  firstName: (val) => (typeof val === 'string') && (val.trim().length > 0),
  lastName: (val) => (typeof val === 'string') && (val.trim().length > 0),
  phone: (val) => (typeof val === 'string') && (val.trim().length === 10),
  password: (val) => (typeof val === 'string') && (val.trim().length > 0),
  tosAccepted: (val) => (typeof val === 'boolean') && (val === true),
};

// helper method for running basic validation
const getFieldErrors = (fields, requiredFields = []) => {
  // seed the field errors array with missing required fields; empty arr if none
  const fieldErrors = requiredFields.reduce((errs, fieldName) => {
    if (typeof fields[fieldName] === 'undefined') {
      errs.push(`Field ${fieldName} is required`);
    }
    return errs;
  }, []);

  Object.keys(fields).forEach((fieldName) => {
    const validator = fieldValidations[fieldName];
    const fieldValue = fields[fieldName];

    if (validator && fieldValue) {
      const valid = validator(fieldValue);
      
      if (!valid) {
        fieldErrors.push(`Field '${fieldName} is invalid`);
      }
    }
  });

  return fieldErrors;
};

// helper wrapper for making token-validated requests
function withToken(tokenizedFunc) {
  return function(data, callback) {
    const { token } = data.headers;
    const phone = data.queryParams.get('phone') || data.payload.phone;

    if ((typeof token === 'string') || (typeof phone === 'string')) {
      tokenHandlers.verifyToken(token, phone, (isValidToken) => {
        if (isValidToken) {
          tokenizedFunc(data, callback);
        } else {
          callback(403, { error: 'Token is invalid' });
        }
      });
    } else {
      callback(403, { error: 'Token is required' });
    }  
  }
}

// private handlers
const userHandlers = {
  POST: (data, callback) => {
    const requiredFields = Object.keys(fieldValidations); // all fields required on POST
    const fieldErrors = getFieldErrors(data.payload, requiredFields);

    if (fieldErrors.length === 0) {
      const { firstName, lastName, password, phone, tosAccepted } = data.payload;

      // does the user already exist?
      dataCrud.read('users', phone, (err, data) => {
        if (err) {
          // hash the password ... at least give'em that much
          const hashedPass = helpers.hash(password);

          if (hashedPass) {
            const userData = {
              firstName,
              lastName,
              phone,
              password: hashedPass,
              tosAccepted: true,
            };
  
            dataCrud.create('users', phone, userData, (err) => {
              if (!err) {
                callback(200);
              } else {
                console.log(err);
                callback(500, { error: `Failed to create user ${phone}`});
              }
            });
          } else {
            callback(500, { error: `Failed to hash password for user ${phone}`});
          }
        } else {
          callback(400, {
            error: `User ${phone} already exists`,
          });
        }
      });
    } else {
      callback(
        400,
        // TODO: this could be more helpful, returning all errors at once to reduce back/forth
        { error: fieldErrors[0] },
      );
    }
  },
  GET: withToken((data, callback) => {
    const { queryParams } = data;
    const phone = queryParams.get('phone');

    if ((typeof phone === 'string') && (phone.trim().length === 10)) {
      dataCrud.read('users', phone, (err, userData) => {
        if (!err && userData) {
          delete userData.password;
          callback(200, userData);
        } else {
          callback(404);
        }
      });
    } else {
      callback(400, { error: 'Field `phone` is required' });
    }
  }),
  PUT: withToken((data, callback) => {
    // bit of a design flaw in the tut, but you can't actually update your phone number ...
    const { phone, ...fieldsToUpdate } = data.payload;
    const fieldNamesToUpdate = Object.keys(fieldsToUpdate);

    if (fieldsToUpdate.password) {
      fieldsToUpdate.password = helpers.hash(fieldsToUpdate(password));
    }

    if ((typeof phone === 'string') && (phone.trim().length === 10)) {
      if (fieldNamesToUpdate.length > 0) {
        dataCrud.read('users', phone, (err, userData) => {
          if (!err && userData) {
            const fieldErrors = getFieldErrors(fieldsToUpdate);

            if (fieldErrors.length === 0) {
              const updates = { ...userData, ...fieldsToUpdate };

              dataCrud.update('users', phone, updates, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { error: `Failed to update user ${phone}` });
                }
              });
            } else {
              callback(400, { error: fieldErrors[0] });
            }
          } else {
            callback(400, { error: `User ${phone} does not exist` });
          }
        });
      } else {
        callback(400, { error: 'At least one field is required to update user' });
      }
    } else {
      callback(400, { error: 'Field `phone` does not appear valid '})
    }
  }),
  DELETE: withToken((data, callback) => {
    const { queryParams } = data;
    const phone = queryParams.get('phone');

    if ((typeof phone === 'string') && (phone.trim().length === 10)) {
      dataCrud.read('users', phone, (err, userData) => {
        if (!err && userData) {
          dataCrud.delete('users', phone, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { error: `Failed to delete user ${phone}` });
            }
          });
        } else {
          callback(400, { error: `User ${phone} was not found` });
        }
      });
    } else {
      callback(400, { error: 'Field `phone` is required' });
    }
  }),
};

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
    const fieldErrors = getFieldErrors(data.payload, ['phone', 'password']);
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
  // non-CRUD helper for verifying token status
  verifyToken: (tokenId, phone, callback) => {
    dataCrud.read('tokens', tokenId, (err, tokenData) => {
      if (!err && tokenData) {
        if ((tokenData.phone === phone) && (tokenData.expires > Date.now())) {
          callback(true);
        } else {
          callback(false);
        }
      } else {
        callback(false);
      }
    });
  },
};

// route handlers
const handlers = {
  notFound: (data, callback) => {
    callback(404);
  },
  ping: (data, callback) => {
    callback(200);
  },
  tokens: (data, callback) => {
    const acceptedMethods = ['POST', 'PUT', 'GET', 'DELETE'];

    if (acceptedMethods.includes(data.method)) {
      tokenHandlers[data.method](data, callback);
    } else {
      callback(405);
    }
  },
  users: (data, callback) => {
    const acceptedMethods = ['POST', 'PUT', 'GET', 'DELETE'];

    if (acceptedMethods.includes(data.method)) {
      userHandlers[data.method](data, callback);
    } else {
      callback(405);
    }
  },
};

module.exports = handlers;
