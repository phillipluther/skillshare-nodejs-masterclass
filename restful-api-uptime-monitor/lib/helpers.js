const crypto = require('crypto');
const config = require('./config');

const helpers = {
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
