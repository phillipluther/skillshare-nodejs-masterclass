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

const currentEnv = (typeof process.env.NODE_ENV === 'string')
  ? process.env.NODE_ENV.toLowerCase()
  : 'staging';

const activeEnv = (typeof environments[currentEnv] === 'object')
  ? environments[currentEnv]
  : 'staging';

module.exports = activeEnv;
