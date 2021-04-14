const dataCrud = require('../data-crud');
const helpers = require('../helpers');
const config = require('../config');
const { verify: verifyToken } = require('./tokens');

const checks = {
  GET: (data, callback) => {
    const { headers, queryParams } = data;
    const checkId = queryParams.get('id');

    if ((typeof checkId === 'string') && (checkId.trim().length > 0)) {
      dataCrud.read('checks', checkId, (err, checkData) => {
        if (!err && checkData) {
          verifyToken(headers.token, checkData.phone, (isValidToken) => {
            if (isValidToken) {
              callback(200, checkData);
            } else {
              callback(403, { error: 'Token is invalid or missing' });
            }
          });
        } else {
          callback(404);
        }
      });
    } else {
      callback(400, { error: 'Field `id` is required to get checks' });
    }
  },
  POST: (data, callback) => {
    const { token } = data.headers;
    const requiredFields = [
      'protocol',
      'url',
      'method',
      'successCodes',
      'timeoutSeconds',
    ];
    const fieldErrors = helpers.getFieldErrors(data.payload, requiredFields);

    if (fieldErrors.length === 0) {
      dataCrud.read('tokens', token, (err, tokenData = {}) => {
        const { phone, expires } = tokenData;
  
        if (!err && phone && (expires > Date.now())) {
          dataCrud.read('users', phone, (err, userData) => {
            if (!err && userData) {
              const { checks: userChecks = [] } = userData;

              if (userChecks.length < config.maxChecks) {
                const checkId = helpers.createRandomString(24);
                const checkObj = {
                  id: checkId,
                  phone,
                  ...requiredFields.reduce((fields, field) => ({
                    ...fields,
                    [field]: data.payload[field],
                  }), {}),
                };

                dataCrud.create('checks', checkId, checkObj, (err) => {
                  if (!err) {
                    // associate checks with the user in addition to the checks collection
                    userData.checks = [...userChecks, checkId];

                    dataCrud.update('users', phone, userData, (err) => {
                      if (!err) {
                        callback(200, checkObj);
                      } else {
                        callback(500, { error: 'Could not update user checks' });
                      }
                    })
                  } else {
                    callback(500, { error: 'Could not create new check' });
                  }
                });
              } else {
                callback(400, { error: `User has maximum number of checks (${config.maxChecks})` });
              }
            } else {
              callback(403, { error: `No user associated with token ${token}` });
            }
          });
        } else {
          callback(403, { error: 'Token is invalid or expired' });
        }
      });

    } else {
      callback(400, { error: fieldErrors[0] });
    }
  },
  PUT: (data, callback) => {
    const { id: checkId } = data.payload;
    const { token } = data.headers;

    if ((typeof checkId === 'string') && (checkId.trim().length > 0)) {
      const fieldErrors = helpers.getFieldErrors([
        'protocol',
        'url',
        'method',
        'successCodes',
        'timeoutSeconds',
      ]);

      if (fieldErrors.length === 0) {
        dataCrud.read('checks', checkId, (err, checkData) => {
          if (!err && checkData) {
            verifyToken(token, checkData.phone, (isValidToken) => {
              if (isValidToken) {
                dataCrud.update('checks', checkId, { ...checkData, ...data.payload }, (err) => {
                  if (!err) {
                    callback(200);
                  } else {
                    callback(500, `Could not update check ${checkId}`)
                  }
                });
              } else {
                callback(403, { error: 'Token is invalid or missing' });
              }
            });
          } else {
            callback(400, { error: `Check ${checkId} not found` });
          }
        });
      } else {
        callback(400, { error: fieldErrors[0] });
      }
    } else {
      callback(400, { error: 'Field `id` is required to update checks '});
    }
  },
  DELETE: (data, callback) => {
    const { queryParams, headers: { token }} = data;
    const checkId = queryParams.get('id');

    if ((typeof checkId === 'string') && (checkId.trim().length > 0)) {
      dataCrud.read('checks', checkId, (err, checkData) => {
        if (!err && checkData) {
          const { phone } = checkData;

          verifyToken(token, phone, (isValidToken) => {
            if (isValidToken) {
              dataCrud.delete('checks', checkId, (err) => {
                if (!err) {
                  dataCrud.read('users', phone, (err, userData) => {
                    if (!err && userData) {
                      const userUpdates = {
                        ...userData,
                        checks: userData.checks.filter((id) => id !== checkId),
                      };

                      dataCrud.update('users', phone, userUpdates, (err) => {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, { error: `Failed to update checks for user ${phone}` });
                        }
                      });
                    } else {
                      callback(500, {
                        error: `Failed to remove check ${checkId} from user ${phone}`
                      });
                    }
                  });
                } else {
                  callback(500, { error: `Failed to delete check ${checkId}` });
                }
              })
            } else {
              callback(403);
            }
          });
        } else {
          callback(400, { error: `Check ${checkId} not found` });
        }
      })

    } else {
      callback(400, { error: 'Field `id` is required' });
    }
  },
};

module.exports = checks;
