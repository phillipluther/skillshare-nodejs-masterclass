const environments = {
  staging: {
    env: 'staging',
    httpPort: 3000,
    httpsPort: 3001,
    hashSecret: 'aStagingSecret', // oh, the humanity! checked in a secret ... shameful.
  },
  production: {
    env: 'production',
    httpPort: 8000,
    httpsPort: 8001,
    hashSecret: 'aSecretOfProduction', // ... and did it AGAIN?!
  },
};

const commonEnv = {
  maxChecks: 5,
  // as suggested, i copied directly from GitHub
  // https://github.com/pirple/The-NodeJS-Master-Class/blob/master/Section%203/Connecting%20to%20an%20API/lib/config.js
  // they are not my personal tokens!
  'twilio' : {
    'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
    'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
    'fromPhone' : '+15005550006',
  },
};

const currentEnv = (typeof process.env.NODE_ENV === 'string')
  ? process.env.NODE_ENV.toLowerCase()
  : 'staging';

const activeEnv = (typeof environments[currentEnv] === 'object')
  ? environments[currentEnv]
  : 'staging';

module.exports = {
  ...commonEnv,
  ...activeEnv,
};
