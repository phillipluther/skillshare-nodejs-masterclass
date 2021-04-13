const crypto = require('crypto');
const config = require('./config');

const helpers = {
  createRandomString: (strLen) => {
    if ((typeof strLen !== 'number') && (strLen < 1)) {
      return false;
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charsLen = chars.length;
    let randomString = '';

    for (let i = 0; i < strLen; i++) {
      randomString += chars.charAt(Math.floor(Math.random() * charsLen));
    }

    return randomString;
  },
  fieldValidations: {
    firstName: (val) => (typeof val === 'string') && (val.trim().length > 0),
    lastName: (val) => (typeof val === 'string') && (val.trim().length > 0),
    phone: (val) => (typeof val === 'string') && (val.trim().length === 10),
    password: (val) => (typeof val === 'string') && (val.trim().length > 0),
    tosAccepted: (val) => (typeof val === 'boolean') && (val === true),
    protocol: (val) => ['http', 'https'].includes(val),
    url: (val) => (typeof val === 'string') && (val.trim().length > 0),
    method: (val) => ['post', 'get', 'put', 'delete'].includes(val),
    successCodes: (val) => Array.isArray(val),
    timeoutSeconds: (val) => 
      (typeof val === 'number') && 
      (val % 1 === 0) && 
      (val >= 1) &&
      (val <= 5),
  },
  // runs basic validation on requests
  getFieldErrors: (fields, requiredFields = []) => {
    // seed the field errors array with missing required fields; empty arr if none
    const fieldErrors = requiredFields.reduce((errs, fieldName) => {
      if (typeof fields[fieldName] === 'undefined') {
        errs.push(`Field ${fieldName} is required`);
      }
      return errs;
    }, []);

    Object.keys(fields).forEach((fieldName) => {
      const validator = helpers.fieldValidations[fieldName];
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
  hash: (str) => {
    if ((typeof str === 'string') && (str.length > 1)) {
      const hashedStr = crypto.createHmac('sha256', config.hashSecret).update(str).digest('hex');
      return hashedStr;
    } else {
      return false;
    }
  },
  // normalize persnickety JSON.parse to prevent throwing
  jsonToObject: (str) => {
    try {
      return JSON.parse(str);
    } catch (err) {
      return {};
    }
  },
};

module.exports = helpers;
