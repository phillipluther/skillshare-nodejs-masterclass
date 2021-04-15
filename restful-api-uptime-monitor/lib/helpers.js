const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');

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
    token: (val) => (typeof val === 'string') && (val.trim().length > 0),
    protocol: (val) => ['http', 'https'].includes(val),
    url: (val) => (typeof val === 'string') && (val.trim().length > 0),
    method: (val) => ['post', 'get', 'put', 'delete'].includes(val),
    successCodes: (val) => Array.isArray(val),
    timeoutSeconds: (val) => 
      (typeof val === 'number') && 
      (val % 1 === 0) && 
      (val >= 1) &&
      (val <= 5),
    message: (val) => {
      const messageLength = val.trim().length;
      const isString = typeof val === 'string';

      return isString && messageLength > 0 && messageLength < 1600;
    },
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
  sendTwilioSMS: (phone, message, callback) => {
    const fieldErrors = helpers.getFieldErrors({ phone, message }, ['phone', 'message']);

    if (fieldErrors.length === 0) {
      const messageString = querystring.stringify(message);
      const twilioPayload = {
        from: config.twilio.fromPhone,
        to: `+1${phone}`,
        body: message,
      };

      const requestDetails = {
        protocol: 'https:',
        hostname: 'api.twilio.com',
        method: 'POST',
        path: `2010-04-01/Accounts/${config.twilio.accountSid}/Messages`,
        auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(messageString),
        },
      };

      const req = https.request(requestDetails, (res) => {
        const { status } = res;

        if ((status === 200) || (status === 201)) {
          callack(false);
        } else {
          callback(`Twilio status code returned ${status}`);
        }
      });

      req.on('error', (err) => callback(err));
      req.write(messageString);
      req.end();

    } else {
      callback(fieldErrors[0]);
    }
  },
};

module.exports = helpers;
