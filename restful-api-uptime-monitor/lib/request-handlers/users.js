const dataCrud = require('../data-crud');
const withToken = require('../with-token')
const helpers = require('../helpers');

const usersHandlers = {
  POST: (data, callback) => {
    const requiredFields = [
      'firstName',
      'lastName',
      'phone',
      'password',
      'tosAccepted',
    ];
    const fieldErrors = helpers.getFieldErrors(data.payload, requiredFields);

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
            const fieldErrors = helpers.getFieldErrors(fieldsToUpdate);

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
              const { checks: userChecks = []} = userData;
              const checksToDelete = userChecks.length;

              let hasDeletionErrors = false;
              let checksDeleted = 0;

              if (checksToDelete > 0) {
                userChecks.forEach((checkId) => {
                  dataCrud.delete('checks', checkId, (err) => {
                    if (err) {
                      hasDeletionErrors = true;
                    }

                    checksDeleted++;

                    if (checksDeleted === checksToDelete) {
                      if (!hasDeletionErrors) {
                        callback(200);
                      } else {
                        callback(500, { error: 'Could not delete all user checks' });
                      }
                    }
                  });
                });
              } else {
                callback(200);
              }
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

module.exports = usersHandlers;
