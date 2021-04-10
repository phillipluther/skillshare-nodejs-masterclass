const dataCrud = require('./data-crud');
const helpers = require('./helpers');

// private handlers
const userHandlers = {
  // fairly sloppy validation logic, but good enough for our tut purposes
  fieldValidations: {
    firstName: (val) => (typeof val === 'string') && (val.trim().length > 0),
    lastName: (val) => (typeof val === 'string') && (val.trim().length > 0),
    phone: (val) => (typeof val === 'string') && (val.trim().length === 10),
    password: (val) => (typeof val === 'string') && (val.trim().length > 0),
    tosAccepted: (val) => (typeof val === 'boolean') && (val === true),
  },
  getFieldErrors: (fields, requiredFields = []) => {
    // seed the field errors array with missing required fields; empty arr if none
    const fieldErrors = requiredFields.reduce((errs, fieldName) => {
      if (typeof fields[fieldName] === 'undefined') {
        errs.push(`Field ${fieldName} is required`);
      }
      return errs;
    }, []);

    Object.keys(fields).forEach((fieldName) => {
      const validator = userHandlers.fieldValidations[fieldName];
      const fieldValue = fields[fieldName];

      if (validator && fieldValue) {
        const valid = validator(fieldValue);
        
        if (!valid) {
          fieldErrors.push(`Field '${fieldName} is invalid`);
        }
      }
    });

    return fieldErrors;
  },

  POST: (data, callback) => {
    const requiredFields = Object.keys(userHandlers.fieldValidations);
    const fieldErrors = userHandlers.getFieldErrors(data.payload, requiredFields);

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
  // TODO: lock this down to auth'd users getting their own data
  GET: (data, callback) => {
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
  },
  // TODO: lock this down, too, so only auth'd users can update their info 
  PUT: (data, callback) => {
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
            const fieldErrors = userHandlers.getFieldErrors(fieldsToUpdate);

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
  },
  // TODO: Again and again ... only Auth'd users can delete their own data
  DELETE: (data, callback) => {
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
  },
};

// route handlers
const handlers = {
  ping: (data, callback) => {
    callback(200);
  },
  notFound: (data, callback) => {
    callback(404);
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
