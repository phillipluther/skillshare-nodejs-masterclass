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
