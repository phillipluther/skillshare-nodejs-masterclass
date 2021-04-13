const dataCrud = require('../data-crud');
const helpers = require('../helpers');
const config = require('../config');

module.exports = {
  GET: (data, callback) => {

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

  },
  DELETE: (data, callback) => {

  },
};
