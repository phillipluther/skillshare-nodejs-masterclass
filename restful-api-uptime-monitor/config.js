const environments = {
  staging: {
    env: 'staging',
    httpPort: 3000,
    httpsPort: 3001,
  },
  production: {
    env: 'production',
    httpPort: 8000,
    httpsPort: 8001,
  },
};

const currentEnv = (typeof process.env.NODE_ENV === 'string')
  ? process.env.NODE_ENV.toLowerCase()
  : 'staging';

const activeEnv = (typeof environments[currentEnv] === 'object')
  ? environments[currentEnv]
  : 'staging';

module.exports = activeEnv;
